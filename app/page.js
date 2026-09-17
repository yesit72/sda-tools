import Link from 'next/link';

export default function Home() {
  return (
    <main className="wrap">
      <h1>SDA 자료 만들기</h1>
      <p className="lead">
        서울도슨트협회 소식지와 행사 사진 콜라주를 만듭니다. 모든 작업은 이 화면 안에서 처리되고
        사진이나 글은 어디에도 올라가지 않습니다.
      </p>
      <div className="cards">
        <Link className="card" href="/newsletter">
          <h2>소식지 만들기</h2>
          <p>3종 포맷에 글을 넣어 한 장으로. PNG와 PPTX로 받습니다.</p>
        </Link>
        <Link className="card" href="/collage">
          <h2>사진 콜라주</h2>
          <p>사진을 고르면 네 장씩 묶어 콜라주를 만듭니다.</p>
        </Link>
      </div>
      <p className="note">
        <b>쓰는 순서</b>
        <br />
        행사가 끝나면 소식지 글을 먼저 만들고, 사진은 콜라주로 묶어 카카오톡에 함께 올리시면 됩니다.
      </p>
    </main>
  );
}
