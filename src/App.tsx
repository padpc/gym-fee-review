import { useEffect, type ReactNode } from 'react';
import { CheckPage } from './pages/CheckPage';
import { HomePage } from './pages/HomePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './styles.css';

type RoutePath = '/' | '/check' | '/methodology' | 'not-found';

const routeMetadata: Record<RoutePath, { title: string; description: string }> = {
  '/': {
    title: '今のジム会費を続ける価値を確認｜ジム会費、元とれてる？',
    description: '実質月額、来館、会費を払う理由として重要だった利用と期待、費用負担から、今のジム会費を続ける価値を整理するブラウザツールです。',
  },
  '/check': {
    title: '会費を支える利用を診断｜ジム会費、元とれてる？',
    description: '基本月会費と追加費用、来館、重要だった利用と期待、費用負担から、今の会費を払う理由と次の一行動を確認します。',
  },
  '/methodology': {
    title: '計算方法と判断の考え方｜ジム会費、元とれてる？',
    description: 'ジム会費見直しチェッカーが使う料金計算、重要な利用の扱い、代表的な判断条件と限界を説明します。',
  },
  'not-found': {
    title: 'ページが見つかりません｜ジム会費、元とれてる？',
    description: '指定されたページは見つかりませんでした。',
  },
};

function normalizePathname(pathname: string): RoutePath {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/' || normalized === '/check' || normalized === '/methodology') {
    return normalized;
  }
  return 'not-found';
}

function FooterLink({ href, currentPath, children }: {
  href: Exclude<RoutePath, 'not-found'>;
  currentPath: RoutePath;
  children: ReactNode;
}) {
  return (
    <a href={href} aria-current={currentPath === href ? 'page' : undefined}>
      {children}
    </a>
  );
}

function PageContent({ path }: { path: RoutePath }) {
  if (path === '/') return <HomePage />;
  if (path === '/check') return <CheckPage />;
  if (path === '/methodology') return <MethodologyPage />;
  return <NotFoundPage />;
}

export default function App() {
  const path = normalizePathname(window.location.pathname);

  useEffect(() => {
    const metadata = routeMetadata[path];
    document.title = metadata.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', metadata.description);
  }, [path]);

  return (
    <>
      <a className="skip-link" href="#main-content">本文へ移動</a>
      <header className="site-header">
        <div className="shell site-header__inner">
          <a
            className="site-name"
            href="/"
            aria-label="ジム会費、元とれてる？ ホーム"
            aria-current={path === '/' ? 'page' : undefined}
          >
            ジム会費、元とれてる？
          </a>
        </div>
      </header>

      <main id="main-content">
        <PageContent path={path} />
      </main>

      <footer className="site-footer">
        <div className="shell site-footer__inner">
          <nav aria-label="フッターナビゲーション">
            <FooterLink href="/" currentPath={path}>ホーム</FooterLink>
            <FooterLink href="/check" currentPath={path}>診断する</FooterLink>
            <FooterLink href="/methodology" currentPath={path}>計算方法</FooterLink>
          </nav>
          <p>契約を変える前に、契約先の最新料金と条件を公式情報で確認してください。</p>
          <p>入力は保存・送信しません。活動や時間を勝手な金額へ換算せず、不透明な総合点を出しません。</p>
        </div>
      </footer>
    </>
  );
}
