import { useEffect, type ReactNode } from 'react';
import { CheckPage } from './pages/CheckPage';
import { HomePage } from './pages/HomePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './styles.css';

type RoutePath = '/' | '/check' | '/methodology' | 'not-found';

const routeMetadata: Record<RoutePath, { title: string; description: string }> = {
  '/': {
    title: 'ジム会費の活用状況を確認｜ジム会費、元とれてる？',
    description: 'ジム会費を、来館回数だけでなく目的活動、内容完了、変化、実際に使ったサービスから見直すブラウザツールです。',
  },
  '/check': {
    title: '会費と使い方を診断｜ジム会費、元とれてる？',
    description: '実質月額と、来館、目的活動、内容完了それぞれの実績単価、使い方、次に変える一つを確認します。',
  },
  '/methodology': {
    title: '計算方法と判断の限界｜ジム会費、元とれてる？',
    description: 'ジム会費見直しチェッカーが使う計算式、比較条件、結果の読み方と判断の限界を説明します。',
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
          <p>入力は保存・送信しません。健康効果や契約変更を断定せず、不透明な総合点を出しません。</p>
        </div>
      </footer>
    </>
  );
}
