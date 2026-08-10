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
        <p>来館、目的活動、内容完了、変化、満足、安全を、不透明な総合点へ混ぜずに扱います。</p>
      </div>

      <nav className="methodology-nav" aria-label="このページの目次">
        <a href="#monthly-cost">実質月額</a>
        <a href="#usage">V・S・F</a>
        <a href="#quality">質と変化</a>
        <a href="#alternative">代替比較</a>
        <a href="#decision">結論の順序</a>
      </nav>

      <section id="monthly-cost" aria-labelledby="monthly-cost-heading">
        <h2 id="monthly-cost-heading">実質月額 C</h2>
        <Formula>実質月額 C ＝ 月会費 ＋ 毎月必須の追加費用 ＋ 年会費等 ÷ 12</Formula>
        <p>
          月会費、毎月必要な費用、年会費は請求周期が違うため分けて入力し、結果で月額相当へまとめます。追加費用の空欄を自動で0円にせず、まず「月会費以外はない」または「追加費用・年会費がある」を明示します。既に支払った入会金や登録料は、今後の継続判断には含めません。
        </p>
      </section>

      <section id="usage" aria-labelledby="usage-heading">
        <h2 id="usage-heading">来館 V・目的活動 S・内容完了 F</h2>
        <Formula>来館1回あたり ＝ C ÷ 来館回数 V</Formula>
        <Formula>目的活動1回あたり ＝ C ÷ 目的活動回数 S</Formula>
        <Formula>内容完了1回あたり ＝ C ÷ 内容完了回数 F</Formula>
        <Formula>活動利用率 ＝ S ÷ V × 100</Formula>
        <Formula>内容完了率 ＝ F ÷ S × 100</Formula>
        <p>
          正確な回数では0 ≤ F ≤ S ≤ Vになることを確認します。0回では割り算をせず、回数不明や範囲を単一の平均回数へ置き換えません。Vが不明でもSやFが分かれば、その回数で計算できる単価だけを表示します。
        </p>
        <h3>実運動時間は任意です</h3>
        <Formula>実運動1時間あたり ＝ C ÷ 実際に運動・目的利用へ使った時間</Formula>
        <p>時間は入力した場合だけ単価を表示します。実運動時間の長さだけで、質が高いとは判定しません。</p>
      </section>

      <section id="quality" aria-labelledby="quality-heading">
        <h2 id="quality-heading">質、変化、実際に使った価値</h2>
        <p>
          主目的は変化の具体例を、主な活動は完了条件と「強度・難易度・内容が活動に合っていたか」という質問を切り替えます。活動の種類そのものへ点数や金額倍率は付けません。
        </p>
        <ul>
          <li>内容完了はFと内容完了率で表示します。</li>
          <li>活動に合う内容だったかは、合っていた・一部・合っていなかった・判断できないをそのまま理由へ使います。</li>
          <li>目的に沿う変化は方向だけを扱い、体重や診断名などの健康データを入力・保存しません。</li>
          <li>実際に使ったクラス、プール、指導、専門設備等は、現在プランで保持したい条件と任意の代替比較へ使います。</li>
          <li>満足と再選択意向は料金へ加点せず、継続候補を出せるかと次の行動へ使います。</li>
        </ul>
      </section>

      <section id="alternative" aria-labelledby="alternative-heading">
        <h2 id="alternative-heading">実在する代替プランとの任意比較</h2>
        <Formula>都度型の代替月額 ＝ 目的活動回数 S × 1回料金 ＋ 固定費 ＋ 年会費 ÷ 12 ＋ 必須サービス費</Formula>
        <p>
          比較は任意です。通常料金と条件を公式ページまたは契約書で確認した候補1件だけを扱います。主な活動、実際に使った付帯サービス、必要な時間帯、店舗範囲のいずれかを満たさない候補は、安くても同等の低料金候補とは判定しません。
        </p>
        <h3>代替を入力しない場合</h3>
        <Formula>同額になる目的活動1回料金 ＝ C ÷ S</Formula>
        <p>料金の得・損は断定しません。同額料金も「通うべき回数」や契約変更の推奨ではなく、今の目的活動を別料金で再現するときの比較条件です。</p>
      </section>

      <section id="decision" aria-labelledby="decision-heading">
        <h2 id="decision-heading">結論を決める順序</h2>
        <ol>
          <li>安全上の懸念</li>
          <li>目的に沿う変化が逆方向</li>
          <li>同じ条件では次月に選ばないという意向</li>
          <li>目的活動0回または内容完了0回</li>
          <li>未完了、または活動に合う内容でなかった状態</li>
          <li>変化なし、再選択を迷う、または判断材料不足</li>
          <li>同等な実在代替の料金が低い状態</li>
          <li>内容完了、良い変化、再選択意向がそろった状態</li>
        </ol>
        <p>これは点数の重みではなく、安全と最初に直す箇所を先に示す決定規則です。結果では理由、次の一行動、何が変われば結論が変わるかを併記します。</p>
        <ul>
          <li>全国一律の「1回いくらなら得」という基準は使いません。</li>
          <li>不明な値を平均値へ置き換えず、判断材料不足と示します。</li>
          <li>安全上の回答は独立して扱い、医療上の緊急性や診断を判定しません。</li>
          <li>健康効果、運動回数の増加、契約変更、休会、退会を自動決定しません。</li>
          <li>交通費と移動時間は計算へ混ぜず、現在と候補を同じ条件で別途確認してください。</li>
        </ul>
      </section>

      <div className="methodology-actions">
        <a className="button button--primary" href="/check">ジム会費を診断する</a>
      </div>
    </article>
  );
}
