// Keep the Uzbekistan country code fixed; accept local digits or pasted +998 numbers.
export function uzPhoneDigits(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length > 9) digits = digits.slice(3);
  return digits.slice(0, 9);
}

export function formatUzPhone(value) {
  const digits = uzPhoneDigits(value);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)]
    .filter(Boolean).join(" ");
}

export function completeUzPhone(value) {
  const digits = uzPhoneDigits(value);
  return digits.length === 9 ? `998${digits}` : "";
}
