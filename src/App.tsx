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
          <span>G1確認版</span>
        </div>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="shell hero__inner">
            <div>
              <p className="eyebrow">直近3か月 × 自分の料金</p>
              <h1>ジム会費、<br />元とれてる？</h1>
              <p className="hero__lead">
                実際に通った回数から、今の月会費と都度払いを料金だけで比較します。
              </p>
              <a className="button button--primary hero__button" href="#calculator">
                自分の料金で計算する
              </a>
            </div>
            <aside className="hero__note" aria-labelledby="hero-note-heading">
              <p className="eyebrow">この計算で分かること</p>
              <h2 id="hero-note-heading">費用の見え方を3つに整理</h2>
              <ol>
                <li><span>01</span>現在の1回あたり費用</li>
                <li><span>02</span>都度払いとの年間差</li>
                <li><span>03</span>料金の低い側が変わる回数</li>
              </ol>
            </aside>
          </div>
        </section>

        <div className="shell main-grid">
          <Calculator />
          <aside className="privacy-note" aria-labelledby="privacy-heading">
            <p className="eyebrow">先に知っておくこと</p>
            <h2 id="privacy-heading">料金だけの試算です</h2>
            <p>
              健康効果、設備、混雑、距離、通いやすさは評価しません。入力した料金と回数はこの画面内だけで計算し、保存・送信しません。
            </p>
          </aside>
        </div>
      </main>
      <footer className="site-footer">
        <div className="shell">
          <p>契約変更の前に、契約先の最新料金と条件を公式情報で確認してください。</p>
          <p>G1確認版 — 外部公開・解析未接続</p>
        </div>
      </footer>
    </>
  );
}
