import { useEffect, type ReactNode } from 'react';
import { CheckPage } from './pages/CheckPage';
import { HomePage } from './pages/HomePage';
import { MethodologyPage } from './pages/MethodologyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './styles.css';

type RoutePath = '/' | '/check' | '/methodology' | 'not-found';

const routeMetadata: Record<RoutePath, { title: string; description: string }> = {
  '/': {
    title: 'ジム会費を払って続ける理由を確認｜ジム会費、元とれてる？',
    description: 'ジム会費を、来館回数だけでなくトレーニング、風呂・サウナ、交流、通いやすさなど本人が残したい価値から見直すブラウザツールです。',
  },
  '/check': {
    title: '会費と残したい価値を診断｜ジム会費、元とれてる？',
    description: '実質月額、来館、館内利用時間、複数の利用価値、継続意向、費用負担から、今の会費を払う理由と次の一行動を確認します。',
  },
  '/methodology': {
    title: '計算方法と判断の限界｜ジム会費、元とれてる？',
    description: 'ジム会費見直しチェッカーが使う料金計算、利用価値の扱い、結論の規則と判断の限界を説明します。',
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
          <p>入力は保存・送信しません。本人の価値を勝手な金額へ換算せず、不透明な総合点を出しません。</p>
        </div>
      </footer>
    </>
  );
}
