import Link from 'next/link';

const NewsIcon = () => (
  <svg width="46" height="72" viewBox="0 0 46 72" aria-hidden="true">
    <rect x="1" y="1" width="44" height="70" rx="6" fill="#fff" stroke="#c9c9c9" />
    <rect x="7" y="7" width="12" height="4" rx="2" fill="#141414" />
    <rect x="7" y="17" width="30" height="5" rx="2.5" fill="#141414" />
    <rect x="7" y="27" width="22" height="2.5" rx="1.25" fill="#9a9a9a" />
    <rect x="7" y="32" width="26" height="2.5" rx="1.25" fill="#9a9a9a" />
    <rect x="7" y="40" width="32" height="2" rx="1" fill="#c4c4c4" />
    <rect x="7" y="45" width="32" height="2" rx="1" fill="#c4c4c4" />
    <rect x="7" y="50" width="24" height="2" rx="1" fill="#c4c4c4" />
    <circle cx="16" cy="63" r="2.5" fill="#FE0106" /><circle cx="23" cy="63" r="2.5" fill="#0AAF50" /><circle cx="30" cy="63" r="2.5" fill="#0000FE" />
  </svg>
);
const CollageIcon = () => (
  <svg width="54" height="72" viewBox="0 0 54 72" aria-hidden="true">
    <rect x="1" y="1" width="52" height="70" rx="6" fill="#fff" stroke="#c9c9c9" />
    <rect x="6" y="6" width="42" height="28" rx="4" fill="#9a9a9a" />
    <rect x="6" y="37" width="19" height="13" rx="3" fill="#bdbdbd" />
    <rect x="6" y="53" width="19" height="13" rx="3" fill="#d4d4d4" />
    <rect x="28" y="37" width="20" height="29" rx="3" fill="#7a7a7a" />
  </svg>
);

export default function Home() {
  return (
    <main className="wrap">
      <img className="brand" src="/sda-logo.png" alt="서울도슨트협회" />
      <h1>SDA 자료 만들기.</h1>
      <p className="lead">
        소식지와 행사 사진 콜라주를 휴대폰에서 바로 만듭니다. 사진과 글은 이 기기 안에서만 처리되고 어디에도 올라가지 않습니다.
      </p>
      <div className="cards">
        <Link className="card" href="/newsletter">
          <div className="thumb-svg"><NewsIcon /></div>
          <div className="card-body">
            <h2>소식지 만들기</h2>
            <p>3종 포맷에 글을 넣고, 미리보기에서 바로 고친 뒤 공유하거나 PNG로 저장합니다.</p>
          </div>
          <div className="arrow" aria-hidden="true">→</div>
        </Link>
        <Link className="card" href="/collage">
          <div className="thumb-svg"><CollageIcon /></div>
          <div className="card-body">
            <h2>사진 콜라주</h2>
            <p>사진 최대 4장을 한 장으로 묶고, 사진마다 보여 줄 부분을 골라 완성합니다.</p>
          </div>
          <div className="arrow" aria-hidden="true">→</div>
        </Link>
      </div>
      <p className="note">
        <b>쓰는 순서</b>
        <br />
        행사가 끝나면 소식지 글을 먼저 만들고, 사진은 콜라주로 묶어 카카오톡에 함께 올리시면 됩니다.
        쓰던 소식지 글은 이 기기에 자동으로 임시 저장됩니다.
      </p>
    </main>
  );
}
