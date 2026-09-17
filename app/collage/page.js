import Link from 'next/link';
import CollageMaker from '../../components/CollageMaker';

export const metadata = { title: 'SDA 사진 콜라주' };

export default function Page() {
  return (
    <main className="wrap">
      <div className="top">
        <h1>사진 콜라주</h1>
        <Link className="back" href="/">← 처음으로</Link>
      </div>
      <CollageMaker />
      <p className="note">
        <b>저장하는 법</b><br />
        저장 버튼을 누르거나, 폰에서는 그림을 길게 눌러 저장하면 됩니다. 갤러리가 안 뜨면 크롬이나 삼성 인터넷에서 열어 주세요.
      </p>
    </main>
  );
}
