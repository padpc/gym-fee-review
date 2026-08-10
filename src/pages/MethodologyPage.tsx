function Formula({ children }: { children: string }) {
  return <p className="formula"><code>{children}</code></p>;
}

export function MethodologyPage() {
  return (
    <article className="shell page-main methodology-page">
      <div className="page-intro">
        <a className="back-link" href="/">ホームへ戻る</a>
        <p className="eyebrow">判定をブラックボックスにしない</p>
        <h1>計算方法と判断の限界</h1>
        <p>金額、回数、時間、目的の実績を、意味の分からない一つの総合点へ混ぜません。</p>
      </div>

      <nav className="methodology-nav" aria-label="このページの目次">
        <a href="#monthly-cost">実質月額</a>
        <a href="#usage">利用実績</a>
        <a href="#plan-rate">利用計画達成率</a>
        <a href="#alternative">代替プラン比較</a>
        <a href="#decision">結果と限界</a>
      </nav>

      <section id="monthly-cost" aria-labelledby="monthly-cost-heading">
        <h2 id="monthly-cost-heading">実質月額 C</h2>
        <Formula>実質月額 C ＝ 月会費 ＋ 毎月必須の追加費用 ＋ 年会費等 ÷ 12</Formula>
        <p>
          月会費、毎月必要な費用、年会費は請求周期が違うため分けて入力し、結果で月額相当へまとめます。追加費用の空欄を自動で0円にせず、まず「月会費以外はない」または「追加費用・年会費がある」を明示します。既に支払った入会金や登録料は、今後の継続判断には含めません。
        </p>
      </section>

      <section id="usage" aria-labelledby="usage-heading">
        <h2 id="usage-heading">利用実績の単価</h2>
        <Formula>1回あたり ＝ C ÷ 来館回数</Formula>
        <Formula>1時間あたり ＝ C ÷ 合計滞在時間</Formula>
        <Formula>目的に使えた来館1回あたり ＝ C ÷ 目的に使えた来館回数</Formula>
        <p>
          利用0回では単価を算出せず、0回と支払額をそのまま示します。回数が範囲の場合は、中央値に置き換えず結果も範囲で表示します。
        </p>
      </section>

      <section id="plan-rate" aria-labelledby="plan-rate-heading">
        <h2 id="plan-rate-heading">利用計画達成率 P</h2>
        <Formula>利用計画達成率 P ＝ 目的に使えた来館回数 ÷ 予定した来館回数 × 100</Formula>
        <p>
          100%は、本人が予定した回数と実績が一致したという意味です。料金の得・損や健康効果を含む総合100点ではありません。予定が分からない場合は率を出しません。具体的な変化・利用の回答は点数へ加算せず、良い変化を確認できない場合に継続候補を出さないための明示的な条件として使います。
        </p>
        <h3>将来候補：数値目標がある場合の進捗率 G（G1対象外）</h3>
        <Formula>目標進捗率 G ＝ 現在までの変化量 ÷ 目標としていた変化量 × 100</Formula>
        <p>この計算は今回のG1診断には含めません。将来追加する場合も、同じ単位の値が分かるときだけ扱い、健康状態の良否とは判定しません。</p>
      </section>

      <section id="alternative" aria-labelledby="alternative-heading">
        <h2 id="alternative-heading">実在する代替プランとの比較</h2>
        <Formula>代替月額 A ＝ 固定費 ＋ 年会費 ÷ 12 ＋ 都度費用 ＋ 必要な追加サービス費</Formula>
        <Formula>実利用の代替価値率 Q ＝ A ÷ C × 100</Formula>
        <ul>
          <li>Qが100%より大きい：同じ利用なら代替の方が高い</li>
          <li>Qが100%：現在と代替が同額</li>
          <li>Qが100%より小さい：同じ利用なら代替の方が低い</li>
        </ul>
        <p>Qは表示時に小数1桁へ丸め、「約」を付けます。料金方向と同額の判定は、表示率ではなく丸め前の金額で行います。</p>
        <p>
          必要な設備、利用回数、利用時間帯、店舗範囲を満たさない候補は、料金が低くても同等とは扱いません。交通費と移動時間はQへ混ぜず、本診断では計算しません。初版は、通常料金、必須費用、利用条件を公式ページや契約書で確認した候補1件を入力して比較します。サイト側がその料金の最新性を検証するものではありません。
        </p>
        <h3>代替が分からない場合の同額条件</h3>
        <Formula>同額になる都度料金 ＝ C ÷ 実際の来館回数</Formula>
        <Formula>同額になる必要回数 ＝ C ÷ 実在する都度料金</Formula>
        <p>必要回数の式は、代替側に固定費・年会費・必須サービス費がない純粋な都度利用だけに使います。必要回数は「通うべき回数」ではなく、二つの料金が同額になる数学上の条件です。</p>
      </section>

      <section id="decision" aria-labelledby="decision-heading">
        <h2 id="decision-heading">結果の出し方と限界</h2>
        <p>
          料金比較、利用計画、利用を妨げた要因から、現状維持、利用方法の再確認、低料金プランの比較、材料の確認のうち一つを主な確認候補として示します。
        </p>
        <ul>
          <li>全国一律の「1回いくらなら得」という基準は使いません。</li>
          <li>不明な値を平均値へ置き換えず、判断材料不足と示します。</li>
          <li>健康効果、契約変更、休会、退会を自動決定しません。</li>
          <li>交通費と移動時間は本診断では計算せず、現在と候補を同じ条件で別途確認してください。</li>
          <li>契約前には、料金、設備、時間帯、変更期限を公式情報で再確認してください。</li>
        </ul>
      </section>

      <div className="methodology-actions">
        <a className="button button--primary" href="/check">会費の活用状況を確認する</a>
      </div>
    </article>
  );
}
