"""Synthetic pages that copy the site's markup. All names are made up."""

LIST_HTML = """
<html><body>
<section data-type-panel="B2C Operator">
  <a href="/casinos/10-alpha-games-n-v" class="casino-row" data-name="alpha games n.v."
     data-registered="2024-03-08 17:42:50" data-domains="2">
    <div class="casino-row-main"><span class="casino-row-name">Alpha Games N.V.</span>
      <span class="license-number">OGL/2024/10/0001</span></div>
    <div class="casino-row-cell" data-label="Registered">Mar 8, 2024</div>
    <div class="casino-row-cell" data-label="Active Domains">2</div>
  </a>
  <a href="/casinos/11-beta-play-b-v" class="casino-row" data-name="beta play b.v."
     data-registered="2023-11-14 19:36:18" data-domains="0">
    <div class="casino-row-main"><span class="casino-row-name">Beta Play B.V.</span>
      <span class="aka">aka Beta Play</span></div>
  </a>
</section>
<section data-type-panel="Official Representative" hidden>
  <a href="/casinos/20-rep-services-n-v" class="casino-row" data-name="rep services n.v."
     data-registered="2024-01-24 10:00:00" data-domains="0">
    <div class="casino-row-main"><span class="casino-row-name">Rep Services N.V.</span></div>
  </a>
</section>
</body></html>
"""


def _person(name: str, role: str, birth: str, passport: str, address: str, verified: bool, until: str = "") -> str:
    tag = '<span class="tag tag-good">Verified</span>' if verified else '<span class="tag">Unverified</span>'
    until_span = f"<span>Until {until}</span>" if until else ""
    return f"""
<details class="entity-row"><summary class="entity-row-summary">
  <div class="entity-avatar entity-avatar-person"><svg/></div>
  <div class="entity-row-main"><div class="entity-row-name">{name}</div><div class="entity-row-role">{role}</div></div>
  <div class="entity-row-dates"><span>Active from Apr 26, 2024</span>{until_span}</div></summary>
  <div class="entity-row-details"><dl class="profile-details">
    <dt>Birth Month</dt><dd>{birth}</dd><dt>Passport Country</dt><dd>{passport}</dd><dt>Position</dt><dd>{role}</dd></dl>
    <div class="profile-addresses"><div class="address-row"><span class="address-type">Residential</span>
      <span class="address-text">{address}</span>{tag}</div></div></div>
</details>"""


ALPHA_HTML = f"""
<html><head><link rel="canonical" href="https://curacaofiles.com/casinos/10-alpha-games-n-v"></head><body>
<header><h1 class="header-title">#CasinoSecrets</h1></header>
<div class="entity-hero"><div id="entity-map" class="map-container" data-markers="[]"></div>
<div class="container entity-hero-content"><h1>Alpha Games N.V.</h1>
  <div class="hero-meta"><span>Gaming Operator</span><span>Registered November 8, 2023</span></div>
  <div class="stats-bar"><div class="stat"><div class="stat-num">2</div><div class="stat-label">Domains</div></div>
  <div class="stat"><div class="stat-num">3</div><div class="stat-label">Related Entities</div></div></div>
</div></div>
<nav class="tabs"><a class="documents-download-all" href="/api/document-archive/10?name=10-alpha-games-n-v">Download all</a></nav>
<section data-entity-panel="documents"><div class="document-tree">
 <details class="document-folder" data-document-folder open><summary><span class="folder-name">Company</span></summary>
  <div class="folder-contents"><details class="document-folder" data-document-folder><summary>
   <span class="folder-name">Ancillary</span></summary><div class="folder-contents">
   <article class="document-row" data-document-row>
     <button class="document-open" type="button" data-document-type="PDF">
       <span class="document-main"><span class="document-name">policy.pdf</span><span class="document-size">1.2 MB</span></span>
     </button>
     <div class="document-actions"><a href="/api/documents/10?key=companies%2F10%2Ffiles%2Fabc.pdf&amp;name=policy.pdf&amp;download=1">Download</a></div>
   </article>
   <article class="document-row" data-document-row>
     <div class="document-open"><span class="document-main"><span class="document-name">sheet.xlsx</span>
       <span class="document-size">36 KB</span></span></div>
     <div class="document-actions"><a href="/api/documents/10?key=companies%2F10%2Ffiles%2Fdef.xlsx&amp;name=sheet.xlsx&amp;download=1">Download</a></div>
   </article>
  </div></details></div></details>
</div></section>
<section data-entity-panel="applications" hidden><div class="flow" data-application-panel="0">
  <div class="app-header"><div class="app-detail-title"><h2>OGL/2024/10/0001</h2><span class="pill status-granted">Granted</span></div>
  <div class="dates"><span>Submitted: July 1, 2024</span><span>End Date: July 8, 2024</span></div></div>
  <div class="section"><h3>Customer</h3><dl><dt>Contact</dt><dd>Jane Example</dd><dt>Email</dt><dd>jane@example.org</dd></dl></div>
  <div class="section"><h3>Review Timeline</h3><div class="timeline"><div class="timeline-item">
    <div class="timeline-content"><div class="timeline-row"><strong>Verification</strong><time>Apr 26, 2024</time></div>
    <details class="timeline-user-details"><summary><span class="timeline-user-avatar">RV</span>Rev Viewer
      <span class="timeline-user-alias">(CGA User 1)</span></summary>
      <div class="timeline-user-info"><span>Employee ID: E-1</span><span>rev@example.org</span></div></details></div></div></div></div>
</div></section>
<div data-entity-panel="domains" hidden><div class="domain-list">
  <div class="domain-row" data-domain-row data-domain-toplevel data-name="alpha.example" data-status="active" data-verified="1"
       data-added="2024-04-25 16:34:01"><div class="domain-row-name-cell"><a class="domain-row-name">alpha.example</a>
    <div class="domain-registrations"><span class="label">Also recorded for:</span><ul>
      <li><span class="jurisdiction">Curaçao</span><a href="/casinos/11-beta-play-b-v?tab=domains&amp;domain=alpha.example">Beta Play B.V.</a></li>
      <li><span class="jurisdiction">Anjouan</span><a href="/other-jurisdictions?company=Gamma+Ltd&amp;domain=alpha.example">Gamma Ltd</a></li>
    </ul></div></div>
    <div class="domain-row-status-cell"><span class="status-text">active</span><span class="domain-row-since">since Aug 8, 2024</span></div></div>
  <details class="domain-group" data-domain-toplevel data-name="alpha2.example" data-status="active" data-added="2024-11-01 16:08:41">
    <summary class="domain-row domain-row-parent" data-domain-row data-name="alpha2.example" data-status="active" data-verified="0">
      <div class="domain-row-dates-cell"><span>Added Nov 1, 2024</span></div></summary>
    <div class="domain-children"><div class="domain-row domain-row-child" data-domain-row data-name="alpha3.example"
      data-status="deleted" data-verified="0"><div class="domain-row-dates-cell"><span>Added Jun 1, 2026</span></div></div></div>
  </details>
</div></div>
<div class="flow" data-entity-panel="people" hidden>
 <section class="entity-group"><div class="section-head"><h2>Qualified Person</h2></div><div class="entity-list">
  {_person("John Q. Sample", "Ultimate Beneficiary Owner", "August 1989", "Moldova, Republic of",
           "CHISINAU, Moldova, Republic of", True, "Oct 28, 2025")}
  {_person("Ana Example", "Chief Executive Officer", "January 1985", "Malta", "IS-SWIEQI, Malta", False)}
 </div></section>
 <section class="entity-group"><div class="section-head"><h2>Local Representative</h2></div><div class="entity-list">
  <details class="entity-row"><summary class="entity-row-summary">
    <div class="entity-avatar entity-avatar-organization"><svg/></div>
    <div class="entity-row-main"><div class="entity-row-name">Rep Services N.V.</div><div class="entity-row-role">Official Representative</div></div>
    <div class="entity-row-dates"><span>Active from Feb 8, 2024</span></div></summary>
    <div class="entity-row-details"><dl class="profile-details"><dt>Entity Profile</dt><dd><a href="/casinos/20-rep-services-n-v">View</a></dd>
      <dt>Business Type</dt><dd>Local Representative Provider</dd></dl></div></details>
 </div></section>
</div>
</body></html>
"""

BETA_HTML = f"""
<html><body><div class="entity-hero-content"><h1>Beta Play B.V.</h1>
<div class="hero-meta"><span>Gaming Operator</span><span>Registered November 14, 2023</span></div></div>
<div class="flow" data-entity-panel="people"><section class="entity-group"><div class="section-head"><h2>Qualified Person</h2></div>
  {_person("John Q Sample", "Director", "August 1989", "Dominica", "Lisbon, Portugal", True)}
  {_person("Ana Example", "Director", "May 1970", "Spain", "Madrid, Spain", True)}
</section></div></body></html>
"""

REP_HTML = """
<html><body><div class="entity-hero-content"><h1>Rep Services N.V.</h1>
<div class="hero-meta"><span>Local Representative Provider</span><span>aka Rep Group</span><span>Registered January 24, 2024</span></div></div>
<section class="entity-group" data-entity-panel="companies"><div class="entity-list">
  <div class="entity-row company-row"><div class="entity-row-main">
    <a class="entity-row-name" href="/casinos/10-alpha-games-n-v">Alpha Games N.V.</a><div class="entity-row-role">B2C Operator</div></div>
    <div class="entity-row-details"><p>Local Representative · From Feb 8, 2024</p></div></div>
</div></section></body></html>
"""

OTHER_HTML = """
<html><body><table><tbody>
<tr data-domain-row data-domain="alpha.example" data-company="Gamma Ltd" data-jurisdiction="Anjouan">
  <th scope="row">alpha.example</th><td><a href="https://anjouan.example/register">Anjouan</a></td><td>Gamma Ltd</td>
  <td><span class="licence-number">ALSI-1</span><span class="licence-detail">B2C · valid</span>
    <span class="licence-detail">Issued: 2024-06-12</span><span class="licence-detail">Expires: 2027-06-11</span></td>
  <td><a class="company-link" href="/casinos/10-alpha-games-n-v?tab=domains">Alpha Games N.V.</a></td></tr>
<tr data-domain-row data-domain="delta.example" data-company="Delta Limited" data-jurisdiction="Kahnawà:ke">
  <th scope="row">delta.example</th><td><a href="https://kahnawake.example/permits">Kahnawà:ke</a></td><td>Delta Limited</td>
  <td><span class="licence-number">Number not listed</span><span class="licence-detail">Permit holder</span>
    <span class="licence-detail">Issued: Not listed</span><span class="licence-detail">Expires: Not listed</span></td>
  <td><span class="unmatched">No matching domain record</span></td></tr>
</tbody></table></body></html>
"""
