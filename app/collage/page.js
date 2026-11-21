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
        휴대폰에서는 &lsquo;카카오톡 등으로 공유&rsquo;를 누르면 바로 카카오톡을 고를 수 있습니다. 저장이 안 되면 그림을 길게 눌러 저장하세요.
      </p>
    </main>
  );
}
