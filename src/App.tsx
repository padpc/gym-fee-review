import { Calculator } from './features/calculator/Calculator';
import './styles.css';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <header className="site-header">
        <div className="shell site-header__inner">
          <a className="site-name" href="/" aria-label="ジム会費、元とれてる？ ホーム">
            ジム会費、元とれてる？
          </a>
          <span>改訂G1確認版</span>
        </div>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="shell hero__inner">
            <div>
              <p className="eyebrow">料金・時間・使い方を分けて確認</p>
              <h1 aria-label="ジム会費を、自分の基準で見直す">ジム会費を、<br />自分の基準で見直す</h1>
              <p className="hero__lead">
                回数を覚えていなくても大丈夫。1回・1時間あたりの料金と、実際に使った設備、続けやすさを混ぜずに整理します。
              </p>
              <a className="button button--primary hero__button" href="#calculator">
                自分の基準で確認する
              </a>
            </div>
            <aside className="hero__note" aria-labelledby="hero-note-heading">
              <p className="eyebrow">5つの確認方法</p>
              <h2 id="hero-note-heading">「元が取れた」を一つの点数にしない</h2>
              <ul>
                <li><span>01</span>1回あたり料金</li>
                <li><span>02</span>1時間あたり料金</li>
                <li><span>03</span>使った設備・プログラム</li>
                <li><span>04</span>続けやすさ</li>
                <li><span>05</span>4項目を分けてまとめて確認</li>
              </ul>
            </aside>
          </div>
        </section>

        <div className="shell main-grid">
          <Calculator />
          <aside className="privacy-note" aria-labelledby="privacy-heading">
            <p className="eyebrow">先に知っておくこと</p>
            <h2 id="privacy-heading">入力と結果について</h2>
            <p>
              健康効果や満足度を採点せず、継続・退会も勧めません。入力内容はこの画面内だけで処理し、保存・送信しません。
            </p>
          </aside>
        </div>
      </main>
      <footer className="site-footer">
        <div className="shell">
          <p>契約変更の前に、契約先の最新料金と条件を公式情報で確認してください。</p>
          <p>改訂G1確認版 — 外部公開・解析未接続</p>
        </div>
      </footer>
    </>
  );
}
