import React from 'react'
import { EMAIL } from '../data.js'
import Nav from './Nav.jsx'
import Footer from './Footer.jsx'

const mail = <a href={'mailto:' + EMAIL}>{EMAIL}</a>

const PAGES = {
  terms: {
    title: 'Terms &', accent: 'conditions.',
    intro: 'These terms apply to your use of the LastFrame website. By using the site, you agree to them.',
    sections: [
      ['Using this site', 'You may browse the site and contact us about a project. Please do not misuse it, interfere with how it works, or copy its content for commercial use without our permission.'],
      ['Project work', 'Nothing on this site is a binding offer. Scope, price, timelines, revisions and ownership of any video we make are set out in a separate written agreement between you and LastFrame.'],
      ['Content and trademarks', 'The videos, text and design on this site belong to LastFrame or its licensors. Client names and logos belong to their respective owners and are shown only to identify work or relationships.'],
      ['No warranty', 'We work to keep the site accurate and available, but it is provided as it is, without any promise that it will always be complete, current or uninterrupted.'],
      ['Limitation of liability', 'To the extent the law allows, LastFrame is not liable for indirect or consequential loss arising from your use of this site.'],
      ['External links', 'The site may link to other websites. We do not control them and are not responsible for their content or practices.'],
      ['Governing law', 'These terms are governed by the laws of India.'],
      ['Changes', 'We may update these terms from time to time. The date at the top of this page shows the latest version.'],
      ['Contact', <>Questions? Write to {mail}.</>],
    ],
  },
  privacy: {
    title: 'Privacy', accent: 'policy.',
    intro: 'This policy explains what information LastFrame receives when you use this website, and how it is used.',
    sections: [
      ['What we collect', <>
        The brief form on this site does not store anything. When you send it, your own email app opens with the details you entered, and nothing reaches us unless you choose to send that email. If you do email us, we receive what you include, such as your name, email address, phone number, company name and details about your product or project.
      </>],
      ['How we use it', 'We use this information to reply to you, discuss your project and carry out any work we agree on. We do not sell it.'],
      ['Cookies and tracking', 'This site does not set its own cookies and does not use analytics or advertising trackers.'],
      ['Third-party services', "The site loads fonts from Google Fonts, which means your browser shares your IP address with Google when a page opens. Google's own privacy policy applies to that request. Email you send us is also handled by your and our email providers."],
      ['Keeping and deleting information', 'We keep project emails only as long as we need them for the work and our records. You can ask us to access, correct or delete your information at any time.'],
      ['Changes', 'We may update this policy from time to time. The date at the top of this page shows the latest version.'],
      ['Contact', <>For any privacy request, write to {mail}.</>],
    ],
  },
}

export default function Legal({ page }) {
  const { title, accent, intro, sections } = PAGES[page]
  return (
    <>
      <div className="grain" aria-hidden="true"></div>
      <Nav />
      <section id="legal">
        <div className="gut rail">
          <article className="legal">
            <h1 className="sec-h">{title} <span className="ser">{accent}</span></h1>
            <p className="legal-date">Last updated: 2 November 2026</p>
            <p>{intro}</p>
            {sections.map(([heading, body]) => (
              <React.Fragment key={heading}>
                <h2>{heading}</h2>
                <p>{body}</p>
              </React.Fragment>
            ))}
          </article>
        </div>
        <Footer />
      </section>
    </>
  )
}
