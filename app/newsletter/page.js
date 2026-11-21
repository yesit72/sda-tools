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
        <b>알아 두기</b><br />
        글이 길면 글자가 자동으로 작아지고, 한 장을 넘으면 알려 드립니다. 쓰던 글은 이 기기에 자동으로 임시 저장되지만 사진은 저장되지 않습니다.
      </p>
    </main>
  );
}
