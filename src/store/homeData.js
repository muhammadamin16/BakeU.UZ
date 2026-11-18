// DEMO ONLY. Production subscriptions must come from your server.
export const demoSubscriptions = [
  { sellerId: 'shahzoda', status: 'active', paymentStatus: 'paid', expiresAt: '2099-01-01T00:00:00Z' },
  { sellerId: 'sweet-home', status: 'active', paymentStatus: 'paid', expiresAt: '2099-01-01T00:00:00Z' },
  { sellerId: 'bakeu', status: 'active', paymentStatus: 'paid', expiresAt: '2099-01-01T00:00:00Z' },
];
export const demoProducts = [
  { id: 'cake', sellerId: 'shahzoda', sellerName: 'Shahzoda Family', name: 'Шоколадный торт', category: 'Торты', price: 45000, image: '/images/products/cake.jpg', color: '#eee5f2' },
  { id: 'cookie', sellerId: 'sweet-home', sellerName: 'Sweet Home', name: 'Печенье', category: 'Печенье', price: 13200, image: '/images/products/cookie.jpg', color: '#f2e5dd' },
  { id: 'bread', sellerId: 'bakeu', sellerName: 'BakeU Bakery', name: 'Домашний хлеб', category: 'Хлеб', price: 3400, image: '/images/products/bread.jpg', color: '#e6eee5' },
  { id: 'somsa', sellerId: 'bakeu', sellerName: 'BakeU Bakery', name: 'Самса', category: 'Самса', price: 7000, image: '/images/products/somsa.jpg', color: '#f6ead4' },
];
export function eligibleProducts(products = [], subscriptions = [], now = Date.now()) {
  const paid = new Set(subscriptions.filter(s => s.status === 'active' && s.paymentStatus === 'paid' && Date.parse(s.expiresAt) > now).map(s => s.sellerId));
  return products.filter(p => paid.has(p.sellerId));
}
