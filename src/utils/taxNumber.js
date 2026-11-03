/**
 * Türkiye vergi kimlik numarası (VKN, 10 hane) doğrulaması.
 * Gelir İdaresi'nin yayımladığı kontrol hanesi algoritması.
 */
function isValidVkn(vkn) {
  if (!/^\d{10}$/.test(String(vkn))) return false;
  const d = String(vkn).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    const tmp = (d[i] + (9 - i)) % 10;
    let v = (tmp * 2 ** (9 - i)) % 9;
    if (tmp !== 0 && v === 0) v = 9;
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[9];
}

module.exports = { isValidVkn };
