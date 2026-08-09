import { Calculator } from './features/calculator/Calculator';
import './styles.css';

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">本文へ移動</a>
      <header className="site-header">
        <div className="shell site-header__inner">
          <a className="site-name" href="/" aria-label="ジム会費、元とれてる？ ホーム">
            ジム会費、元とれてる？
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="hero">
          <div className="shell hero__inner">
            <p className="eyebrow">料金と利用価値を別々に判定</p>
            <h1>今のジム会費に、納得できていますか？</h1>
            <p className="hero__lead">自分で決めた料金基準と、入会目的を実現できているかから確認します。</p>
          </div>
        </section>

        <div className="shell main-content">
          <Calculator />
          <aside className="privacy-note" aria-labelledby="privacy-heading">
            <h2 id="privacy-heading">入力と判定について</h2>
            <p>入力は端末内だけで処理し、保存・送信しません。健康効果や全国共通のお得度を判定せず、契約変更も自動で勧めません。</p>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <div className="shell">
          <p>契約変更の前に、契約先の最新料金と条件を公式情報で確認してください。</p>
          <p>G1第2回改訂確認版 — 未公開・解析未接続</p>
        </div>
      </footer>
    </>
  );
}
