import { useEffect, type ReactNode } from 'react';
import { trackEvent } from './analytics/events';
import { CheckPage } from './pages/CheckPage';
import { HomePage } from './pages/HomePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { feedbackFormUrl } from './releaseConfig';
import './styles.css';

type RoutePath = '/' | '/check' | '/methodology' | 'not-found';

const routeMetadata: Record<RoutePath, { title: string; description: string }> = {
  '/': {
    title: 'ジム会費、元とれてる？｜料金・来館・利用価値から無料診断',
    description: '月会費、必須費、年会費、来館回数、ジムで重要だった利用から、会費を続ける根拠と見直す根拠を無料で整理します。登録不要です。',
  },
  '/check': {
    title: 'ジム会費が元を取れているか診断｜ジム会費、元とれてる？',
    description: '実質月額、来館回数、重要な利用、会費負担を入力し、継続根拠・料金確認・1か月確認・見直し候補を確認できます。',
  },
  '/methodology': {
    title: 'ジム会費の計算方法と判断例｜ジム会費、元とれてる？',
    description: '実質月額、1回・1時間あたり料金の計算例と、同じ会費でも継続根拠や見直し候補に分かれる考え方を説明します。',
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

function NavLink({ href, currentPath, children }: {
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
          >
            <img className="site-name__mark" src="/favicon.svg" alt="" aria-hidden="true" width="32" height="32" />
            <span>ジム会費、元とれてる？</span>
          </a>
          <nav className="site-nav" aria-label="主要ナビゲーション">
            <NavLink href="/" currentPath={path}>ホーム</NavLink>
            <NavLink href="/check" currentPath={path}>診断する</NavLink>
            <NavLink href="/methodology" currentPath={path}>計算方法</NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <PageContent path={path} />
      </main>

      <footer className="site-footer">
        <div className="shell site-footer__inner">
          <nav aria-label="フッターナビゲーション">
            <NavLink href="/" currentPath={path}>ホーム</NavLink>
            <NavLink href="/check" currentPath={path}>診断する</NavLink>
            <NavLink href="/methodology" currentPath={path}>計算方法</NavLink>
          </nav>
          {feedbackFormUrl ? (
            <a
              className="feedback-link"
              href={feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('feedback_open')}
            >
              この診断への意見を送る
              <span aria-hidden="true"> ↗</span>
            </a>
          ) : null}
          <p>この診断は、入力した内容を整理するための目安です。継続・休会・変更・退会の最終判断はご自身で行ってください。</p>
        </div>
      </footer>
    </>
  );
}
