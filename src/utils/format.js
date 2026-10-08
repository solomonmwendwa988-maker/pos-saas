export const formatKSh = n =>
  `KSh ${Number(n || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export const formatKShPrecise = n =>
  `KSh ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatNumber = n => Number(n || 0).toLocaleString('en-KE');