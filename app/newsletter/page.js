import Link from 'next/link';
import NewsletterMaker from '../../components/NewsletterMaker';

export const metadata = { title: 'SDA 소식지 만들기' };

export default function Page() {
  return (
    <main className="wrap">
      <div className="top">
        <h1>소식지 만들기</h1>
        <Link className="back" href="/">← 처음으로</Link>
      </div>
      <NewsletterMaker />
      <p className="note">
        <b>규칙</b><br />
        제목 26~30pt, 정보줄 15pt, 본문 16~17pt, 글자는 Noto Sans KR입니다. 본문에 이모지는 넣지 않습니다.
      </p>
    </main>
  );
}
