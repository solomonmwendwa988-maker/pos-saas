async generateLabelSheet({ business = {}, products, copiesPerProduct = 1 }) {
  if (!products || products.length === 0) {
    throw new Error('No products to print labels for.');
  }
  // ...rest unchanged
}