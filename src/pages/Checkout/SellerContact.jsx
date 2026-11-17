import { writeClipboard } from "../../platform/device.js";
import { translateText } from "../../i18n/index.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, MessageCircle, Copy, Check } from "lucide-react";
import { contactPhone, orderMessage, smsLink } from "../../store/checkout";

export default function SellerContact({ shop, order, draft = false }) {
  const [notice, setNotice] = useState("");
  const [showText, setShowText] = useState(false);
  const phone = contactPhone(shop.phone);
  const text = orderMessage(order, draft);
  const apple = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return (
    <div className="ck-contact">
      <div className="ck-contact-number">
        <Phone size={18} />
        {phone ? (
          <a href={"tel:" + phone}>{translateText(shop.phone)}</a>
        ) : (
          <span>{translateText("Телефон не указан — уточните в чате")}</span>
        )}
        {shop.hours && <small>{translateText(shop.hours)}</small>}
      </div>
      {shop.demo && (
        <small className="ck-muted">
          {translateText(
            "Демо-магазин: телефон и контакты приведены для примера.",
          )}
        </small>
      )}
      <div className="ck-actions">
        {phone && (
          <a className="ck-button" href={"tel:" + phone}>
            <Phone size={16} />
            {translateText("Позвонить")}
          </a>
        )}
        {phone && (
          <a className="ck-button" href={smsLink(phone, text, apple)}>
            <MessageCircle size={16} />
            {translateText("Подготовить SMS")}
          </a>
        )}
        <Link
          className="ck-button"
          to={"/messages?seller=" + encodeURIComponent(shop.id) + "&checkout=1"}
        >
          <MessageCircle size={16} />
          {translateText("Чат BakeU")}
        </Link>
        <button
          type="button"
          className="ck-button"
          onClick={async () => {
            try {
              await writeClipboard(text);
              setNotice(
                "Текст скопирован. Отправьте его продавцу удобным способом.",
              );
            } catch {
              setShowText(true);
              setNotice("Выделите и скопируйте текст ниже.");
            }
          }}
        >
          {notice.startsWith("Текст") ? (
            <Check size={16} />
          ) : (
            <Copy size={16} />
          )}
          {translateText("Скопировать заказ")}
        </button>
      </div>
      <button
        type="button"
        className="ck-text-button"
        aria-expanded={showText}
        onClick={() => setShowText(!showText)}
      >
        {translateText(
          showText ? "Скрыть текст сообщения" : "Посмотреть текст сообщения",
        )}
      </button>
      {showText && (
        <textarea
          className="ck-message-preview"
          aria-label={translateText("Текст для " + shop.name)}
          readOnly
          value={text}
          rows={8}
          onFocus={(event) => event.target.select()}
        />
      )}
      {notice && (
        <p className="ck-feedback" role="status">
          {translateText(notice)}
        </p>
      )}
      <p className="ck-muted">
        {translateText(
          "SMS откроется на вашем телефоне. Отправку подтверждаете вы; стоимость — по тарифу оператора.",
        )}
      </p>
    </div>
  );
}
