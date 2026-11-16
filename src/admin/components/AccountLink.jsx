import { translateText } from "../../i18n/index.js";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { initials } from "../utils/accounts";

export default function AccountLink({ person, kind = "customers" }) {
  return (
    <Link
      className="ad-person-link"
      to={`/admin/${kind}/${encodeURIComponent(person.id)}`}
    >
      <span
        className={`ad-person-avatar ${kind === "sellers" ? "seller" : ""}`}
        aria-hidden="true"
      >
        {initials(translateText(person.name))}
      </span>
      <span>
        <strong>{translateText(person.name)}</strong>
        <small>
          {translateText("Открыть профиль")}{" "}
          <ArrowUpRight
            size={12}
            className="ad-inline-arrow"
            aria-hidden="true"
          />
        </small>
      </span>
    </Link>
  );
}
