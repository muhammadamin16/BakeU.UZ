import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isEmail, loginUser } from "../../utils/auth";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
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
    if (!isEmail(form.email)) e.email = "To'g'ri email kiriting";
    if (!form.password) e.password = "Parolni kiriting";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 500)); // demo kechikish
      loginUser(form);
      navigate("/profile");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-logo">Bake<span>U</span></Link>
        <h1>Qaytganingiz bilan!</h1>
        <p className="auth-sub">Akkauntingizga kirib, buyurtmalaringizni davom ettiring.</p>

        <form onSubmit={onSubmit} noValidate>
          {serverError && <div className="alert" role="alert">{serverError}</div>}

          <div className={`field ${errors.email ? "has-error" : ""}`}>
            <label htmlFor="email">Gmail</label>
            <input id="email" name="email" type="email" autoComplete="email"
              placeholder="siz@gmail.com" value={form.email} onChange={onChange} />
            {errors.email && <small>{errors.email}</small>}
          </div>

          <div className={`field ${errors.password ? "has-error" : ""}`}>
            <label htmlFor="password">Parol</label>
            <div className="pass-wrap">
              <input id="password" name="password" type={showPass ? "text" : "password"}
                autoComplete="current-password" placeholder="Parolingiz"
                value={form.password} onChange={onChange} />
              <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                {showPass ? "Yashirish" : "Ko'rsatish"}
              </button>
            </div>
            {errors.password && <small>{errors.password}</small>}
          </div>

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>

        <p className="auth-switch">
          Akkauntingiz yo'qmi? <Link to="/register">Akkaunt ochish</Link>
        </p>
      </section>
    </main>
  );
}
