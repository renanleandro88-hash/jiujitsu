import { Link } from 'react-router-dom';

export default function Brand() {
  return (
    <Link to="/" className="brand">
      <div className="logoBox">
        <img src="/logo/logo.png" onError={e => (e.currentTarget.style.display = 'none')} alt="Instituto Realiza" />
        <b>IR</b>
      </div>
      <div>
        <strong>INSTITUTO REALIZA</strong>
        <small>PROJETO SOCIAL JIU-JITSU</small>
      </div>
    </Link>
  );
}
