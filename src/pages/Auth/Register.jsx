import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { isEmail, isPhone, registerUser } from "../../utils/auth";
import "./Auth.css";

const ROLES = [
  { id: "customer", icon: "🧁", title: "Xaridor", text: "Shirinliklarni tanlab, buyurtma beraman" },
  { id: "seller", icon: "🍰", title: "Sotuvchi", text: "O'z mahsulotlarimni BakeU'da sotaman" },
];

const initial = { firstName: "", lastName: "", phone: "+998", email: "", password: "" };

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = ROLES.some((r) => r.id === params.get("role")) ? params.get("role") : "";

  const [role, setRole] = useState(preset);
  const [step, setStep] = useState(preset ? 2 : 1);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (form.firstName.trim().length < 2) e.firstName = "Ismingizni kiriting";
    if (form.lastName.trim().length < 2) e.lastName = "Familiyangizni kiriting";
    if (!isPhone(form.phone)) e.phone = "Format: +998 90 123 45 67";
    if (!isEmail(form.email)) e.email = "To'g'ri email kiriting";
    if (form.password.length < 6) e.password = "Parol kamida 6 ta belgidan iborat bo'lsin";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600)); // demo kechikish
      registerUser({ ...form, role });
      navigate("/profile");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Komponent emas, oddiy funksiya: har renderda input fokusini yo'qotmaydi
  const field = ({ name, label, type = "text", placeholder, autoComplete }) => (
    <div className={`field ${errors[name] ? "has-error" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} placeholder={placeholder}
        autoComplete={autoComplete} value={form[name]} onChange={onChange} />
      {errors[name] && <small>{errors[name]}</small>}
    </div>
  );

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link to="/" className="auth-logo">Bake<span>U</span></Link>

        {step === 1 ? (
          <>
            <h1>Akkaunt turini tanlang</h1>
            <p className="auth-sub">Siz kim sifatida BakeU'dan foydalanmoqchisiz?</p>
            <div className="role-grid" role="radiogroup" aria-label="Akkaunt turi">
              {ROLES.map((r) => (
                <button key={r.id} type="button" role="radio" aria-checked={role === r.id}
                  className={`role-card ${role === r.id ? "active" : ""}`}
                  onClick={() => setRole(r.id)}>
                  <span className="role-icon" aria-hidden="true">{r.icon}</span>
                  <strong>{r.title}</strong>
                  <span>{r.text}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-block" disabled={!role} onClick={() => setStep(2)}>
              Davom etish
            </button>
          </>
        ) : (
          <>
            <button className="back-link" onClick={() => setStep(1)}>← Turini o'zgartirish</button>
            <h1>{role === "seller" ? "Sotuvchi akkaunti" : "Xaridor akkaunti"}</h1>
            <p className="auth-sub">Ma'lumotlaringizni kiriting, bir daqiqada tayyor bo'ladi.</p>

            <form onSubmit={onSubmit} noValidate>
              {serverError && <div className="alert" role="alert">{serverError}</div>}

              <div className="field-row">
                {field({ name: "firstName", label: "Ism", placeholder: "Aziza", autoComplete: "given-name" })}
                {field({ name: "lastName", label: "Familiya", placeholder: "Karimova", autoComplete: "family-name" })}
              </div>
              {field({ name: "phone", label: "Telefon raqam", type: "tel", placeholder: "+998 90 123 45 67", autoComplete: "tel" })}
              {field({ name: "email", label: "Gmail", type: "email", placeholder: "siz@gmail.com", autoComplete: "email" })}

              <div className={`field ${errors.password ? "has-error" : ""}`}>
                <label htmlFor="password">Parol</label>
                <div className="pass-wrap">
                  <input id="password" name="password" type={showPass ? "text" : "password"}
                    autoComplete="new-password" placeholder="Kamida 6 ta belgi"
                    value={form.password} onChange={onChange} />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                    {showPass ? "Yashirish" : "Ko'rsatish"}
                  </button>
                </div>
                {errors.password && <small>{errors.password}</small>}
              </div>

              <button className="btn btn-primary btn-block" disabled={loading}>
                {loading ? "Yaratilmoqda..." : "Akkaunt ochish"}
              </button>
            </form>
          </>
        )}

        <p className="auth-switch">
          Akkauntingiz bormi? <Link to="/login">Kirish</Link>
        </p>
      </section>
    </main>
  );
}