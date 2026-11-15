export function accountFields(kind) {
  return [
    { key: "name", label: "Имя и фамилия" },
    { key: "phone", label: "Телефон", type: "tel" },
    {
      key: "email",
      label: "Email",
      type: "email",
      required: kind === "customers",
    },
    {
      key: "login",
      label: "Логин",
      required: false,
      hint: "Если не указан, в карточке используется email. Авторизация сайта подключается отдельно.",
    },
    { key: "address", label: "Адрес", required: false },
    { key: "date", label: "Дата регистрации", type: "date", required: false },
    { key: "status", label: "Статус", options: ["Активен", "Заблокирован"] },
    {
      key: "notes",
      label: "Заметка администратора",
      type: "textarea",
      required: false,
    },
  ];
}
