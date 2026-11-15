const demoPhotos = {
  P101: ["Шоколадный торт", "/images/products/cake.jpg"],
  P102: ["Домашняя самса", "/images/products/somsa.jpg"],
  P103: ["Овсяное печенье", "/images/products/cookie.jpg"],
};

export function safeProductImage(value) {
  if (typeof value !== "string") return "";
  return /^(\/(?!\/)|https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(
    value.trim(),
  )
    ? value.trim()
    : "";
}

export function productPhoto(record) {
  if (record.image !== undefined) return record.image;
  const demo = demoPhotos[record.id];
  return demo && record.name === demo[0] ? demo[1] : "";
}

export async function readAdminPicture(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Выберите JPG, PNG или WebP.");
  if (file.size > 8 * 1024 * 1024)
    throw Error("Размер файла должен быть не больше 8 МБ.");
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/webp", 0.8);
    if (data.length > 600000)
      throw Error(
        "Изображение слишком сложное. Выберите фото меньшего размера.",
      );
    return data;
  } finally {
    image.close();
  }
}
