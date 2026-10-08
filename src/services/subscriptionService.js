import { storage, wait, makeId } from './storage';
import { eventBus, EVENTS } from './eventBus';
import { PLANS, TRIAL_DAYS, getPlan, planPrice } from '@/config/plans';
import { addDays, nextInvoiceNumber } from '@/utils/billing';

const SUB_KEY = 'subscription';
const INV_KEY = 'invoices';
const TRIAL_KEY = 'trial:started';

function defaultSubscription() {
  const startedAt = new Date();
  const trialEnd = addDays(startedAt, TRIAL_DAYS);
  return {
    planId: 'starter',
    status: 'trial',
    billingCycle: 'monthly',
    trialStart: startedAt.toISOString(),
    trialEnd: trialEnd.toISOString(),
    cycleStart: startedAt.toISOString(),
    cycleEnd: trialEnd.toISOString(),
    cancelledAt: null,
    cancelReason: null,
    pendingPlanId: null,
    pendingChangeEffectiveAt: null,
    currentPeriodPaid: 0,
    lastPaymentAt: null,
    paymentMethod: null,
    createdAt: startedAt.toISOString(),
  };
}

class SubscriptionService {
  async current() {
    await wait(100);
    let sub = storage.read(SUB_KEY, null);
    if (!sub) {
      sub = defaultSubscription();
      storage.write(SUB_KEY, sub);
      storage.write(TRIAL_KEY, sub.trialStart);
    }
    return this._enrich(sub);
  }

  async plans() {
    await wait(60);
    return PLANS;
  }

  async invoices() {
    await wait(80);
    return storage.read(INV_KEY, []);
  }

  /**
   * Persist a computed proration and switch the plan immediately.
   * Creates an invoice for any amount owed.
   */
  async changePlan({
    toPlanId,
    annual,
    paymentMethod = 'mpesa',
    proration,
  }) {
    await wait(400);
    const sub = storage.read(SUB_KEY, defaultSubscription());
    const fromPlan = getPlan(sub.planId);
    const toPlan = getPlan(toPlanId);

    const now = new Date();
    const cycleEnd = addDays(now, annual ? 365 : 30);

    const updated = {
      ...sub,
      planId: toPlanId,
      status: 'active',
      billingCycle: annual ? 'annual' : 'monthly',
      cycleStart: now.toISOString(),
      cycleEnd: cycleEnd.toISOString(),
      currentPeriodPaid: annual
        ? Math.round(toPlan.price * 0.83) * 12
        : toPlan.price,
      lastPaymentAt: now.toISOString(),
      paymentMethod,
      pendingPlanId: null,
      pendingChangeEffectiveAt: null,
    };
    storage.write(SUB_KEY, updated);

    // Create invoices
    const invoice = this._createInvoice({
      type: 'subscription',
      planId: toPlanId,
      planName: toPlan.name,
      cycle: annual ? 'annual' : 'monthly',
      amount: annual ? Math.round(toPlan.price * 0.83) * 12 : toPlan.price,
      method: paymentMethod,
      status: 'paid',
      periodStart: now.toISOString(),
      periodEnd: cycleEnd.toISOString(),
    });

    if (proration && proration.amount !== 0) {
      this._createInvoice({
        type: proration.amount > 0 ? 'proration-charge' : 'proration-credit',
        planId: toPlanId,
        planName:
          proration.amount > 0
            ? `Prorated upgrade to ${toPlan.name}`
            : `Prorated credit from ${fromPlan.name}`,
        cycle: 'proration',
        amount: Math.abs(proration.amount),
        method: paymentMethod,
        status: proration.amount > 0 ? 'paid' : 'credited',
        periodStart: now.toISOString(),
        periodEnd: cycleEnd.toISOString(),
      });
    }

    eventBus.emit('subscription:changed', updated);

    return { subscription: this._enrich(updated), invoice };
  }

  /**
   * Downgrades apply at the end of the current cycle.
   */
  async scheduleDowngrade(toPlanId) {
    await wait(250);
    const sub = storage.read(SUB_KEY, defaultSubscription());
    const updated = {
      ...sub,
      pendingPlanId: toPlanId,
      pendingChangeEffectiveAt: sub.cycleEnd,
    };
    storage.write(SUB_KEY, updated);
    eventBus.emit('subscription:changed', updated);
    return this._enrich(updated);
  }

  async cancelPendingChange() {
    await wait(200);
    const sub = storage.read(SUB_KEY, defaultSubscription());
    const updated = {
      ...sub,
      pendingPlanId: null,
      pendingChangeEffectiveAt: null,
    };
    storage.write(SUB_KEY, updated);
    return this._enrich(updated);
  }

  async cancelSubscription(reason) {
    await wait(300);
    const sub = storage.read(SUB_KEY, defaultSubscription());
    const updated = {
      ...sub,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: (reason || '').trim(),
    };
    storage.write(SUB_KEY, updated);
    eventBus.emit('subscription:changed', updated);
    return this._enrich(updated);
  }

  async reactivate() {
    await wait(300);
    const sub = storage.read(SUB_KEY, defaultSubscription());
    const updated = {
      ...sub,
      status: 'active',
      cancelledAt: null,
      cancelReason: null,
    };
    storage.write(SUB_KEY, updated);
    eventBus.emit('subscription:changed', updated);
    return this._enrich(updated);
  }

  async syncUsage(usage) {
    await wait(40);
    const sub = storage.read(SUB_KEY, defaultSubscription());
    storage.write(SUB_KEY, { ...sub, usage });
    return { ...sub, usage };
  }

  _createInvoice(payload) {
    const invoices = storage.read(INV_KEY, []);
    const lastNumber = invoices[0]?.number;
    const number = nextInvoiceNumber(lastNumber);
    const invoice = {
      id: makeId('inv'),
      number,
      issuedAt: new Date().toISOString(),
      ...payload,
    };
    invoices.unshift(invoice);
    storage.write(INV_KEY, invoices);
    return invoice;
  }

  _enrich(sub) {
    const plan = getPlan(sub.planId);
    const pendingPlan = sub.pendingPlanId ? getPlan(sub.pendingPlanId) : null;
    return { ...sub, plan, pendingPlan };
  }

  async reset() {
    storage.remove(SUB_KEY);
    storage.remove(INV_KEY);
    storage.remove(TRIAL_KEY);
  }
}

export const subscriptionService = new SubscriptionService();