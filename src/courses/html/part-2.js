import {
  para, list, codeExample, tip, keyPoint, warning,
  question, fillBlank, choiceTask, reorderTask, codeTask, lesson,
} from '../content-helpers.js'

// Modules 4–6 — Links and Navigation, Images and Media, Lists and Tables

export const part2Lessons = [
  lesson({
    id: 'links',
    title: 'Creating Links',
    duration: 8,
    objectives: [
      'Create a link with the <a> element',
      'Write useful anchor text',
      'Link between pages of the same site',
    ],
    sections: [
      para('Links are what make the web a *web*. The anchor element `<a>` turns text (or an image) into a clickable link:'),
      codeExample('<a href="https://www.codecraft.dev">Learn to code</a>', '`href` holds the destination; the text between the tags is the anchor text.'),
      list([
        '`href` — where the link goes (a full URL, a file, or a `#` fragment).',
        'Anchor text should describe the destination — never "click here".',
        'Links are inline: they sit inside paragraphs and sentences.',
      ]),
      keyPoint('Screen reader users often tab from link to link and hear only the anchor text. "Read more" repeated twenty times is unusable — describe the target.'),
      codeExample('<p>Read <a href="/blog">our blog</a> for weekly tutorials.</p>', 'A link flowing naturally inside a paragraph.'),
      tip('Browsers show unvisited links in one colour and visited links in another — that is a usability feature, not decoration.'),
    ],
    takeaways: [
      '`<a href="…">text</a>` creates a link.',
      'Descriptive anchor text beats "click here".',
      'Relative URLs (`/about`) stay on your site; absolute URLs leave it.',
    ],
    task: {
      brief: 'Add a link to `https://www.codecraft.dev` with the anchor text "Start learning today", placed inside the paragraph.',
      starter: '<h1>Keep learning</h1>\n<p>The best way to learn coding is to build things.</p>',
      checks: [
        { pattern: '<a[^>]*href="https://www\.codecraft\.dev"', message: 'Add an <a> tag with href="https://www.codecraft.dev".' },
        { pattern: '<a[^>]*>[^<]{5,}</a>', message: 'Give the link visible anchor text.' },
        { pattern: '<p>.*<a[^>]*>.*</a>.*</p>', flags: 'i', message: 'Place the <a>…</a> inside the paragraph.' },
      ],
      solution: '<h1>Keep learning</h1>\n<p>The best way to learn coding is to <a href="https://www.codecraft.dev">Start learning today</a>.</p>',
    },
    practice: [
      fillBlank({
        id: 'p-href',
        prompt: 'The destination of a link is stored in the `____` attribute.',
        blanks: [['href']],
        hints: ['It is short for "hypertext reference".'],
        explanation: 'href tells the browser where to go when the link is activated.',
      }),
      choiceTask({
        id: 'p-anchor-text',
        prompt: 'Which anchor text is most accessible?',
        options: ['"HTML fundamentals course"', '"Click here"', '"Link"'],
        answer: 0,
        hints: ['Read the link out loud on its own.'],
        explanation: 'Descriptive anchor text makes sense out of context — essential for screen reader users.',
      }),
    ],
    quiz: [
      question(
        'Which element creates a hyperlink?',
        ['`<a>`', '`<link>`', '`<href>`'],
        0,
        '<a> is the anchor element. <link> lives in the head and loads stylesheets.',
      ),
      question(
        'Where does the destination URL go?',
        ['In the `href` attribute', 'Between the tags', 'In the `src` attribute'],
        0,
        'href = destination. Text between <a> and </a> becomes the visible anchor.',
      ),
    ],
  }),

  lesson({
    id: 'url-types',
    title: 'Relative and Absolute URLs',
    duration: 9,
    objectives: [
      'Tell absolute and relative URLs apart',
      'Link to files within your own site',
      'Use root-relative paths',
    ],
    sections: [
      para('There are two families of URLs:'),
      list([
        '**Absolute** — the full address including protocol and domain: `https://www.codecraft.dev/courses/html`.',
        '**Relative** — a path measured from the current page: `about.html`, `../index.html`.',
        '**Root-relative** — starts from the site root: `/courses/html`.',
      ]),
      codeExample(
        '<!-- Absolute: leaves your site -->\n<a href="https://developer.mozilla.org">MDN</a>\n\n<!-- Relative: same folder -->\n<a href="about.html">About us</a>\n\n<!-- Root-relative: from the domain root -->\n<a href="/courses/html">HTML course</a>',
      ),
      para('Think of relative paths like directions from where you are standing: "the room next door" (relative) versus "12 Developer Street, Learn City" (absolute).'),
      keyPoint('Use relative paths for anything inside your own project — your site keeps working when you move it to a new domain or open it offline.'),
      tip('`../` means "go up one folder". It is worth practising because it trips up everyone at least once.'),
    ],
    takeaways: [
      'Absolute URLs include `https://` and a domain.',
      'Relative URLs resolve from the current page\'s folder.',
      'Root-relative URLs start with `/`.',
    ],
    task: {
      brief: 'Add three links: one absolute link to `https://example.com`, one relative link to `about.html`, and one root-relative link to `/contact`. Put them in an unordered list.',
      starter: '<h1>Site links</h1>\n<ul>\n</ul>',
      checks: [
        { pattern: '<a[^>]*href="https://example\.com"', message: 'Add the absolute link to https://example.com.' },
        { pattern: '<a[^>]*href="about\.html"', message: 'Add the relative link to about.html.' },
        { pattern: '<a[^>]*href="/contact"', message: 'Add the root-relative link to /contact.' },
        { pattern: '<li>.*<a', flags: 'i', message: 'Wrap each link in an <li> list item.' },
      ],
      solution: '<h1>Site links</h1>\n<ul>\n  <li><a href="https://example.com">An external website</a></li>\n  <li><a href="about.html">About this site</a></li>\n  <li><a href="/contact">Contact us</a></li>\n</ul>',
    },
    practice: [
      choiceTask({
        id: 'p-url-kind',
        prompt: 'Which of these is an absolute URL?',
        options: [
          '`https://www.codecraft.dev/learn`',
          '`courses/html.html`',
          '`../images/logo.png`',
        ],
        answer: 0,
        hints: ['It must work even if you copy it into a brand new browser tab.'],
        explanation: 'Only an absolute URL is complete on its own — the others depend on where the current page lives.',
      }),
      fillBlank({
        id: 'p-parent-folder',
        prompt: 'The path segment `____/` moves one folder up.',
        blanks: [['..']],
        hints: ['Two dots, not one.'],
        explanation: '../ refers to the parent directory — handy for shared assets like a site-wide stylesheet.',
      }),
    ],
    quiz: [
      question(
        'What does `<a href="about.html">` link to?',
        ['A file in the same folder as the current page', 'A file at the domain root', 'An external website'],
        0,
        'A path without / or a domain is relative to the current page.',
      ),
      question(
        'Which path always starts from the website root?',
        ['`/contact`', '`contact.html`', '`../contact`'],
        0,
        'A leading slash anchors the path to the domain root.',
      ),
    ],
  }),

  lesson({
    id: 'email-phone-links',
    title: 'Email and Telephone Links',
    duration: 6,
    objectives: [
      'Create a mailto: link',
      'Create a tel: link',
      'Explain when each is useful',
    ],
    sections: [
      para('Not every link points at a web page. The `href` can start with a **protocol** that launches a different app:'),
      codeExample(
        '<p>Email us at <a href="mailto:hello@codecraft.dev">hello@codecraft.dev</a></p>\n<p>Call <a href="tel:+441234567890">+44 1234 567890</a></p>',
      ),
      list([
        '`mailto:` opens the visitor\'s email app with the address ready.',
        '`tel:` dials the number on a phone, or opens the dialler on desktop.',
        'For `tel:`, use the international format with `+` and no spaces.',
      ]),
      keyPoint('On mobile, a `tel:` link turns a phone number into a single tap — small detail, big usability win.'),
      warning('Spaces inside `tel:` links break on some devices. Write `+441234567890`, not `+44 1234 567890`.'),
    ],
    takeaways: [
      '`mailto:` links open an email composer.',
      '`tel:` links dial a phone number.',
      'Both are just `href` values with a different protocol.',
    ],
    task: {
      brief: 'Add an email link to `hello@codecraft.dev` and a telephone link to `+441234567890` in the contact list.',
      starter: '<h2>Contact</h2>\n<ul>\n  <li>Email: </li>\n  <li>Phone: </li>\n</ul>',
      checks: [
        { pattern: '<a[^>]*href="mailto:hello@codecraft\.dev"', message: 'Add a mailto: link with the full address.' },
        { pattern: '<a[^>]*href="tel:[+]441234567890"', message: 'Add a tel: link with no spaces in the number.' },
      ],
      solution: '<h2>Contact</h2>\n<ul>\n  <li>Email: <a href="mailto:hello@codecraft.dev">hello@codecraft.dev</a></li>\n  <li>Phone: <a href="tel:+441234567890">+44 1234 567890</a></li>\n</ul>',
    },
    practice: [
      fillBlank({
        id: 'p-mailto',
        prompt: 'To open an email app from a link, start the href with `______:`.',
        blanks: [['mailto']],
        hints: ['It reads like "mail to".'],
        explanation: 'mailto:hello@example.com opens the visitor\'s default mail client with the address prefilled.',
      }),
      choiceTask({
        id: 'p-tel-format',
        prompt: 'Which is the safest `tel:` value?',
        options: ['`tel:+441234567890`', '`tel:44 1234 567890`', '`tel:phone`'],
        answer: 0,
        hints: ['Which one contains no characters that could confuse a phone?'],
        explanation: 'International format with + and no spaces works across countries and devices.',
      }),
    ],
    quiz: [
      question(
        'What does `<a href="mailto:sam@example.com">` do?',
        ['Opens the visitor\'s email app', 'Sends an email automatically', 'Copies the address'],
        0,
        'It opens a compose window — the visitor still presses Send.',
      ),
      question(
        'Why use `tel:` links on a contact page?',
        ['Mobile visitors can dial in one tap', 'It validates the number', 'It speeds up the page'],
        0,
        'It removes typing effort and mistakes on phones.',
      ),
    ],
  }),

  lesson({
    id: 'new-tabs',
    title: 'Opening Links in New Tabs',
    duration: 7,
    objectives: [
      'Open a link in a new tab with target="_blank"',
      'Add rel="noopener" for security',
      'Decide when a new tab is appropriate',
    ],
    sections: [
      para('By default a link navigates in the current tab. The `target` attribute changes that:'),
      codeExample('<a href="https://www.codecraft.dev" target="_blank" rel="noopener">CodeCraft</a>'),
      list([
        '`target="_blank"` — open the destination in a new tab or window.',
        '`rel="noopener"` — stop the new page from controlling your tab (a real security concern).',
        '`rel="noreferrer"` — additionally hides the referring address.',
      ]),
      keyPoint('Always pair `target="_blank"` with `rel="noopener"`. Modern browsers protect you automatically, but older ones do not.'),
      warning('Do not open *every* link in a new tab — it breaks the Back button and confuses screen reader users. Reserve it for leaving your site.'),
      tip('If the link stays inside your site, let it navigate normally.'),
    ],
    takeaways: [
      '`target="_blank"` opens a new tab.',
      'Always add `rel="noopener"` for security.',
      'Use new tabs sparingly and deliberately.',
    ],
    task: {
      brief: 'Make the external link open in a new tab **securely**: add both `target="_blank"` and `rel="noopener"` to the `<a>` element.',
      starter: '<p>External resource: <a href="https://developer.mozilla.org">MDN Web Docs</a></p>',
      checks: [
        { pattern: '<a[^>]*target="_blank"', message: 'Add target="_blank" to the opening <a> tag.' },
        { pattern: '<a[^>]*rel="noopener"', message: 'Add rel="noopener" as well.' },
        { pattern: '<a[^>]*target="_blank"[^>]*rel="noopener"|<a[^>]*rel="noopener"[^>]*target="_blank"', message: 'Both attributes belong on the same <a> element.' },
      ],
      solution: '<p>External resource: <a href="https://developer.mozilla.org" target="_blank" rel="noopener">MDN Web Docs</a></p>',
    },
    practice: [
      fillBlank({
        id: 'p-target-blank',
        prompt: 'The attribute value that opens a new tab is `target="_______"`.',
        blanks: [['blank', '_blank']],
        hints: ['The value is one word, preceded by an underscore.'],
        explanation: 'target="_blank" is the only value needed for a new tab; there is no "new" or "window" option.',
      }),
      choiceTask({
        id: 'p-noopener',
        prompt: 'Why pair `target="_blank"` with `rel="noopener"`?',
        options: [
          'It prevents the new page from scripting your tab',
          'It opens two tabs instead of one',
          'It makes the link load faster',
        ],
        answer: 0,
        hints: ['It is a security precaution.'],
        explanation: 'Without noopener the opened page gets a reference to your window and can manipulate it via window.opener.',
      }),
    ],
    quiz: [
      question(
        'Which attribute opens a link in a new tab?',
        ['`target="_blank"`', '`rel="blank"`', '`open="new"`'],
        0,
        'target="_blank" tells the browser to use a new browsing context.',
      ),
      question(
        'When is a new tab a good idea?',
        ['When the link leaves your site', 'For every internal link', 'Never'],
        0,
        'Keeping the visitor\'s place on your page while they check an external resource is considerate.',
      ),
    ],
  }),

  lesson({
    id: 'images',
    title: 'Adding Images',
    duration: 8,
    objectives: [
      'Insert an image with <img>',
      'Set src and alt attributes',
      'Explain why img is a void element',
    ],
    sections: [
      para('The `<img>` element embeds an image. It is a void element — there is no content and no closing tag:'),
      codeExample('<img src="cat.jpg" alt="A ginger cat sleeping">'),
      list([
        '`src` — where the image file lives (URL or path).',
        '`alt` — alternative text read aloud by screen readers and shown if the image fails.',
        'Optional: `width` and `height` to reserve space and avoid layout jumps.',
      ]),
      codeExample(
        '<img src="https://placehold.co/400x160/0f2b46/e34f26?text=CodeCraft"\n     alt="CodeCraft logo"\n     width="400"\n     height="160">',
        'An image with reserved dimensions.',
      ),
      keyPoint('Images have no closing tag: there is no text inside them to wrap.'),
      warning('A missing `alt` leaves screen reader users hearing only "image" — always write one, even if it is `alt=""` for decorative images.'),
    ],
    takeaways: [
      '`<img src="…" alt="…">` embeds an image.',
      'Images are void elements.',
      'Every image needs meaningful `alt` text.',
    ],
    task: {
      brief: 'Add an image using the URL `https://placehold.co/400x160` with alt text describing it, then add a caption paragraph underneath.',
      starter: '<h1>Photo gallery</h1>\n<p>My favourite picture:</p>',
      checks: [
        { pattern: '<img[^>]*src="https://placehold\.co/400x160"', message: 'Add an <img> with src="https://placehold.co/400x160".' },
        { pattern: '<img[^>]*alt="[^"]{5,}"', message: 'Add descriptive alt text (5+ characters).' },
        { pattern: '<p>[^<]{10,}</p>', message: 'Add a caption paragraph below the image.' },
      ],
      solution: '<h1>Photo gallery</h1>\n<p>My favourite picture:</p>\n<img src="https://placehold.co/400x160" alt="A blue placeholder banner image">\n<p>This banner sits neatly below the image as a caption.</p>',
    },
    practice: [
      fillBlank({
        id: 'p-img-src',
        prompt: 'The image file location goes in the `____` attribute.',
        blanks: [['src']],
        hints: ['Short for "source".'],
        explanation: 'src points at the file; alt describes it for people and machines that cannot see it.',
      }),
      choiceTask({
        id: 'p-img-void',
        prompt: 'Which is correct?',
        options: [
          '`<img src="a.jpg" alt="A">`',
          '`<img src="a.jpg" alt="A"></img>`',
          '`<img src="a.jpg">A</img>`',
        ],
        answer: 0,
        hints: ['Does an image have text content inside it?'],
        explanation: 'Images have no content, so they never close.',
      }),
    ],
    quiz: [
      question(
        'What is `alt` text for?',
        ['Describing the image when it cannot be seen', 'Setting the image width', 'Naming the file'],
        0,
        'Alt text serves screen readers, slow connections and broken images.',
      ),
      question(
        'Do `<img>` elements need a closing tag?',
        ['No', 'Yes, always', 'Only in HTML5'],
        0,
        'Images are void elements — like <br> and <hr>.',
      ),
    ],
  }),

  lesson({
    id: 'image-paths',
    title: 'Image Paths',
    duration: 7,
    objectives: [
      'Reference local images with relative paths',
      'Use root-relative paths for shared assets',
      'Troubleshoot broken images',
    ],
    sections: [
      para('An `src` can be a full URL or a path inside your project:'),
      codeExample(
        '<!-- Same folder -->\n<img src="logo.png" alt="Logo">\n\n<!-- Inside an images folder -->\n<img src="images/cat.jpg" alt="Cat">\n\n<!-- From the site root -->\n<img src="/assets/logo.png" alt="Logo">\n\n<!-- External host -->\n<img src="https://placehold.co/320x120" alt="Placeholder">',
      ),
      para('Most "my image is broken" problems are path problems: wrong folder, wrong letter case, or a missing file.'),
      list([
        'Check spelling — `Images/` ≠ `images/` on case-sensitive servers.',
        'Confirm the file actually exists at that location.',
        'Remember `../` when the image lives one folder up.',
      ]),
      keyPoint('The browser resolves image paths exactly the same way it resolves link paths — learn one and you know both.'),
      tip('Keep images in an `assets/` or `images/` folder so your project stays tidy as it grows.'),
    ],
    takeaways: [
      '`src` accepts absolute URLs and relative paths.',
      'Path mistakes are the usual cause of broken images.',
      'Case matters on real web servers.',
    ],
    task: {
      brief: 'Add two images: one referenced with the relative path `images/cat.jpg`, and one using an absolute URL `https://placehold.co/300x120`. Both need alt text.',
      starter: '<h1>Two ways to load an image</h1>\n<p>See the difference below:</p>',
      checks: [
        { pattern: '<img[^>]*src="images/cat\.jpg"', message: 'Add the local image with src="images/cat.jpg".' },
        { pattern: '<img[^>]*src="https://placehold\.co/300x120"', message: 'Add the external image with the absolute URL.' },
        { pattern: '<img[^>]*alt="[^"]{3,}"', message: 'Both images need alt text.' },
      ],
      solution: '<h1>Two ways to load an image</h1>\n<p>See the difference below:</p>\n<img src="images/cat.jpg" alt="A cat sitting on a windowsill">\n<img src="https://placehold.co/300x120" alt="Grey placeholder rectangle">',
    },
    practice: [
      choiceTask({
        id: 'p-broken-image',
        prompt: 'An image shows a broken-image icon. What is the most likely cause?',
        options: [
          'The src path does not point to a real file',
          'The alt text is too long',
          'The page has no <title>',
        ],
        answer: 0,
        hints: ['Follow the path in src step by step.'],
        explanation: 'A 404 or typo in src is behind almost every broken image. Alt text only appears if the image fails.',
      }),
      fillBlank({
        id: 'p-img-folder',
        prompt: 'To reach a file one folder above, start the path with `____/`.',
        blanks: [['..']],
        hints: ['Two dots and a slash.'],
        explanation: 'For example: src="../images/logo.png" loads an image from the parent folder.',
      }),
    ],
    quiz: [
      question(
        'Which src loads an image from a folder next to the page?',
        ['`images/cat.jpg`', '`/images/cat.jpg`', '`https://images/cat.jpg`'],
        0,
        'A path with no leading slash is relative to the current page.',
      ),
      question(
        'Why should file names match exactly?',
        ['Servers treat uppercase and lowercase differently', 'It improves SEO', 'It compresses the image'],
        0,
        'On Linux servers, "Cat.jpg" and "cat.jpg" are different files.',
      ),
    ],
  }),

  lesson({
    id: 'alt-text',
    title: 'Alt Text and Accessibility',
    duration: 8,
    objectives: [
      'Write useful alt text',
      'Mark decorative images correctly',
      'Recognise common alt-text mistakes',
    ],
    sections: [
      para('Alt text is a *text alternative* for an image. It is read aloud by screen readers, shown when the image fails to load, and indexed by search engines.'),
      codeExample(
        '<!-- Informative: describe what matters -->\n<img src="chart.png" alt="Sales up 40% in 2024">\n\n<!-- Decorative: empty alt -->\n<img src="divider.svg" alt="">',
      ),
      list([
        'Describe the **information** the image carries, not its file name.',
        'Do not start with "image of…" — the screen reader already says "graphic".',
        'Use `alt=""` for purely decorative images so they are skipped.',
        'Functional images (logo links, icon buttons) describe the **action**: "Go to home page".',
      ]),
      keyPoint('Good alt text answers: "If this image vanished, what would the reader lose?"'),
      warning('Never skip `alt` altogether. An empty string (`alt=""`) is a deliberate choice; a missing attribute is an oversight that produces noisy announcements.'),
    ],
    takeaways: [
      'Alt text conveys the image\'s purpose or information.',
      'Decorative images get `alt=""`.',
      'Descriptive alt text is an accessibility requirement, not a nicety.',
    ],
    task: {
      brief: 'Improve this section: give the chart meaningful alt text, add a decorative divider with empty alt, and add a short paragraph explaining the chart in words.',
      starter: '<h2>Our results</h2>\n<img src="chart.png">\n<img src="divider.svg">',
      checks: [
        { pattern: '<img[^>]*alt="[^"]{15,}"', message: 'Write descriptive alt text (15+ characters) for the chart.' },
        { pattern: '<img[^>]*alt=""', message: 'Give the decorative divider alt="" so it is skipped.' },
        { pattern: '<p>[^<]{20,}</p>', message: 'Explain the data in a paragraph too.' },
      ],
      solution: '<h2>Our results</h2>\n<img src="chart.png" alt="Line chart showing sales rising 40% between 2023 and 2024">\n<p>Sales grew by 40% year on year, driven mostly by the new online store.</p>\n<img src="divider.svg" alt="">',
    },
    practice: [
      choiceTask({
        id: 'p-decorative-alt',
        prompt: 'How do you mark a purely decorative image?',
        options: ['`alt=""`', 'Omit `alt` entirely', '`alt="decorative"`'],
        answer: 0,
        hints: ['You want the screen reader to say nothing at all.'],
        explanation: 'alt="" tells assistive technology to skip the image. Omitting alt makes it announce "image" with no description.',
      }),
      choiceTask({
        id: 'p-logo-alt',
        prompt: 'A company logo links to the home page. What is the best alt text?',
        options: ['"Go to home page"', '"Logo image"', '"IMG_0042.png"'],
        answer: 0,
        hints: ['This image performs an action.'],
        explanation: 'Functional images should describe what activating them does.',
      }),
    ],
    quiz: [
      question(
        'Alt text is primarily for whom?',
        ['People who cannot see the image', 'Search engine crawlers only', 'Developers'],
        0,
        'Screen reader users, broken-image fallbacks and search engines all benefit.',
      ),
      question(
        'Which alt text best describes a photo of a runner finishing a race?',
        ['"Maria crossing the finish line at 2:14, arms raised"', '"Photo"', '"Runner.jpg"'],
        0,
        'It conveys the meaningful content: who, what and the notable detail.',
      ),
    ],
  }),

  lesson({
    id: 'audio-video',
    title: 'Audio and Video',
    duration: 8,
    objectives: [
      'Embed audio with <audio>',
      'Embed video with <video>',
      'Provide fallbacks with <source> and fallback text',
    ],
    sections: [
      para('HTML can play media without any plugins. Both elements take the `controls` attribute to show play/pause UI:'),
      codeExample(
        '<audio controls>\n  <source src="episode.mp3" type="audio/mpeg">\n  Your browser does not support audio.\n</audio>\n\n<video controls width="480">\n  <source src="lesson.mp4" type="video/mp4">\n  Your browser does not support video.\n</video>',
      ),
      list([
        '`controls` — without it, visitors see nothing to press.',
        '`muted`, `loop`, `autoplay` — optional behaviours (autoplay must be muted to be allowed).',
        'Fallback text inside the element shows if the browser cannot play the format.',
        '`<track kind="captions">` adds subtitles for accessibility.',
      ]),
      keyPoint('Always provide captions or a transcript — hearing-impaired learners rely on them, and they help everyone in noisy places too.'),
      warning('Autoplaying media with sound is hostile UX. Browsers block it, and visitors will leave.'),
    ],
    takeaways: [
      '`<audio>` and `<video>` with `controls` are plugin-free.',
      'List files with `<source>` and add fallback text.',
      'Captions and transcripts matter for accessibility.',
    ],
    task: {
      brief: 'Add a video element with `controls`, a `<source>` pointing to `lesson.mp4`, and fallback text for browsers that cannot play it.',
      starter: '<h2>Lesson recording</h2>\n<p>Watch the walkthrough below.</p>',
      checks: [
        { pattern: '<video[^>]*controls', message: 'Add the controls attribute to <video>.' },
        { pattern: '<source[^>]*src="lesson\.mp4"', message: 'Add <source src="lesson.mp4"> inside the video.' },
        { pattern: '<video.*</video>', flags: 'i', message: 'Close the <video> element with fallback text inside.' },
      ],
      solution: '<h2>Lesson recording</h2>\n<p>Watch the walkthrough below.</p>\n<video controls width="480">\n  <source src="lesson.mp4" type="video/mp4">\n  Sorry, your browser cannot play this video.\n</video>',
    },
    practice: [
      choiceTask({
        id: 'p-controls',
        prompt: 'What does the `controls` attribute do?',
        options: [
          'Shows play, pause and volume buttons',
          'Starts the video immediately',
          'Downloads the file',
        ],
        answer: 0,
        hints: ['Without it, what would the user click?'],
        explanation: 'No controls means no visible UI — media plays only if you script it yourself.',
      }),
      fillBlank({
        id: 'p-source-tag',
        prompt: 'Media files are listed with the `<______>` element inside audio or video.',
        blanks: [['source']],
        hints: ['It names the origin of the file.'],
        explanation: 'Using <source> lets you offer several formats so each browser can pick one it supports.',
      }),
    ],
    quiz: [
      question(
        'Which attribute is essential for usable media?',
        ['`controls`', '`autoplay`', '`poster`'],
        0,
        'Visitors need visible controls to interact with the media.',
      ),
      question(
        'How do you offer subtitles?',
        ['A `<track kind="captions">` element', 'The `alt` attribute', '`<caption>`'],
        0,
        'track with kind="captions" references a WebVTT file.',
      ),
    ],
  }),

  lesson({
    id: 'ordered-lists',
    title: 'Ordered Lists',
    duration: 6,
    objectives: [
      'Build a numbered list with <ol> and <li>',
      'Know when numbering is meaningful',
    ],
    sections: [
      para('Use an ordered list when the **sequence matters**: steps in a recipe, rankings, instructions.'),
      codeExample(
        '<ol>\n  <li>Open your editor.</li>\n  <li>Write some HTML.</li>\n  <li>Press Run.</li>\n</ol>',
        'Browsers number each <li> automatically.',
      ),
      para('The browser supplies the numbers — you only write the items. Change `type="a"` for letters or `type="i"` for Roman numerals, and use `start` to begin from another value.'),
      keyPoint('If you can shuffle the items without changing the meaning, it should probably be an unordered list.'),
      warning('Never write "1.", "2." manually inside `<li>` — if you edit the list later, every number has to be renumbered by hand.'),
    ],
    takeaways: [
      '`<ol>` + `<li>` = numbered list.',
      'Order must carry meaning.',
      'Let the browser do the numbering.',
    ],
    task: {
      brief: 'Create an ordered list with the three steps of publishing a web page: write the HTML, open it in a browser, share the URL.',
      starter: '<h2>How to publish a page</h2>\n',
      checks: [
        { pattern: '<ol.*</ol>', flags: 'i', message: 'Wrap your steps in an <ol>…</ol> element.' },
        { pattern: '(?s)<ol>.*<li>.*<li>.*<li>.*</ol>', flags: 'i', message: 'Add three <li> items inside the ordered list.' },
        { pattern: '<li>\s*1\.', not: true, message: 'Do not type the numbers yourself — the browser adds them.' },
      ],
      solution: '<h2>How to publish a page</h2>\n<ol>\n  <li>Write your HTML in a text file.</li>\n  <li>Open the file in a browser to check it.</li>\n  <li>Upload it and share the URL.</li>\n</ol>',
    },
    practice: [
      choiceTask({
        id: 'p-ol-vs-ul',
        prompt: 'Which content should be an ordered list?',
        options: ['Steps to restart a router', 'Colours of a flag', 'Names of teammates'],
        answer: 0,
        hints: ['Which one breaks if you reorder it?'],
        explanation: 'Sequence matters for instructions, so <ol> is correct. The others are unordered collections.',
      }),
      fillBlank({
        id: 'p-li-tag',
        prompt: 'Each item in a list is wrapped in a `<____>` element.',
        blanks: [['li']],
        hints: ['Short for "list item".'],
        explanation: '<ol> and <ul> are containers; <li> holds each actual item.',
      }),
    ],
    quiz: [
      question(
        'Which element creates a numbered list?',
        ['`<ol>`', '`<ul>`', '`<li>`'],
        0,
        '<ol> = ordered list. <li> only creates a single item.',
      ),
      question(
        'Should you type numbers inside list items?',
        ['No — the browser numbers them', 'Yes — otherwise they will not show', 'Only for long lists'],
        0,
        'Typing numbers yourself means renumbering everything by hand after an edit.',
      ),
    ],
  }),

  lesson({
    id: 'unordered-lists',
    title: 'Unordered Lists',
    duration: 7,
    objectives: [
      'Build a bulleted list with <ul>',
      'Nest one list inside another',
      'Use lists for navigation menus',
    ],
    sections: [
      para('When order does not matter, use `<ul>` — the browser shows bullets:'),
      codeExample('<ul>\n  <li>HTML</li>\n  <li>CSS</li>\n  <li>JavaScript</li>\n</ul>'),
      para('Lists can nest. Put a new `<ul>` inside an `<li>` to build sub-lists:'),
      codeExample(
        '<ul>\n  <li>Frontend\n    <ul>\n      <li>HTML</li>\n      <li>CSS</li>\n    </ul>\n  </li>\n</ul>',
      ),
      para('In fact, navigation menus are just lists of links — that is how nearly every site on the web is built:'),
      codeExample('<nav>\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/courses">Courses</a></li>\n  </ul>\n</nav>'),
      keyPoint('Lists are structural: screen readers announce "list, 4 items", which helps users understand the shape of your content.'),
      tip('When you nest, keep every `<li>` inside its parent `<ul>` — the closing tags must mirror each other.'),
    ],
    takeaways: [
      '`<ul>` = bulleted list for unordered content.',
      'Lists nest cleanly inside list items.',
      'Navigation menus are built from lists of links.',
    ],
    task: {
      brief: 'Build a nested learning roadmap: a top-level `<ul>` with "Web Development" and "Data" items, and a nested `<ul>` under the first item listing HTML, CSS and JavaScript.',
      starter: '<h2>My roadmap</h2>\n<ul>\n  <li>Web Development</li>\n  <li>Data</li>\n</ul>',
      checks: [
        { pattern: '(?s)<li>.*<ul>.*<li>.*<li>.*<li>.*</ul>', flags: 'i', message: 'Nest a <ul> inside the Web Development <li> with three items.' },
        { pattern: '<li>\s*<a', message: 'Add at least one link inside a list item.' },
      ],
      solution: '<h2>My roadmap</h2>\n<ul>\n  <li>Web Development\n    <ul>\n      <li><a href="/learn/html">HTML</a></li>\n      <li>CSS</li>\n      <li>JavaScript</li>\n    </ul>\n  </li>\n  <li>Data</li>\n</ul>',
    },
    practice: [
      choiceTask({
        id: 'p-nav-list',
        prompt: 'What is the standard way to build a navigation menu?',
        options: [
          'A `<ul>` (or `<ol>`) of links, usually inside `<nav>`',
          'A `<table>` of links',
          'A series of `<h1>` elements',
        ],
        answer: 0,
        hints: ['Think about what a menu really is: a group of items.'],
        explanation: 'A list of links gives screen readers the right structure: "navigation, list, 5 items".',
      }),
      fillBlank({
        id: 'p-ul-tag',
        prompt: 'A bulleted list uses the `<____>` element.',
        blanks: [['ul']],
        hints: ['Short for "unordered list".'],
        explanation: '<ul> renders bullets by default; <ol> renders numbers.',
      }),
    ],
    quiz: [
      question(
        'When should you use `<ul>` instead of `<ol>`?',
        ['When the order of items does not matter', 'When items are numbered', 'When items are links'],
        0,
        'Unordered = meaning does not change if you shuffle the items.',
      ),
      question(
        'Where does a nested list go?',
        ['Inside an `<li>` of the parent list', 'After `</ul>`', 'Inside `<head>`'],
        0,
        'Nesting inside the list item keeps the structure valid.',
      ),
    ],
  }),

  lesson({
    id: 'tables',
    title: 'Creating Tables',
    duration: 8,
    objectives: [
      'Build a table with rows and cells',
      'Distinguish <tr>, <td> and <table>',
      'Add a caption',
    ],
    sections: [
      para('Tables display **tabular data** — information with rows and columns that belong together.'),
      codeExample(
        '<table>\n  <caption>Course progress</caption>\n  <tr>\n    <td>HTML</td>\n    <td>80%</td>\n  </tr>\n  <tr>\n    <td>CSS</td>\n    <td>45%</td>\n  </tr>\n</table>',
      ),
      list([
        '`<table>` — the container.',
        '`<tr>` — a table row.',
        '`<td>` — a data cell inside a row.',
        '`<caption>` — the table\'s title (one per table).',
      ]),
      keyPoint('A cell is defined by position: the first `<td>` in the second `<tr>` is row 2, column 1. There is no "column" element.'),
      warning('Do not use tables to lay out a page — that is what CSS Grid and Flexbox are for. Tables are for data only.'),
    ],
    takeaways: [
      '`<table>` → `<tr>` → `<td>`.',
      'Add a `<caption>` describing the data.',
      'Tables are for data, never page layout.',
    ],
    task: {
      brief: 'Create a table captioned "Favourite foods" with a header row of Name and Rating, and two data rows.',
      starter: '<h2>My table</h2>\n<table>\n</table>',
      checks: [
        { pattern: '<caption>[^<]+</caption>', message: 'Add a <caption> describing the table.' },
        { pattern: '(?s)<table.*<tr.*</tr>.*<tr.*</tr>', flags: 'i', message: 'Add at least two <tr> rows.' },
        { pattern: '<td>.*</table>', flags: 'i', message: 'Add data cells with <td> inside a row.' },
      ],
      solution: '<h2>My table</h2>\n<table>\n  <caption>Favourite foods</caption>\n  <tr>\n    <td>Pizza</td>\n    <td>5 / 5</td>\n  </tr>\n  <tr>\n    <td>Sushi</td>\n    <td>4 / 5</td>\n  </tr>\n</table>',
    },
    practice: [
      reorderTask({
        id: 'p-table-structure',
        prompt: 'Arrange the pieces into a valid table (outermost first).',
        fragments: ['<tr>', '</tr>', '<td>Sales</td>', '</td>', '<table>'],
        answer: ['<table>', '<tr>', '<td>Sales</td>', '</td>', '</tr>'],
        hints: ['The container comes first and closes last.', 'A row wraps cells.'],
        explanation: 'table → tr → td … </td> → </tr> → </table>. Each element closes inside the one that opened it.',
      }),
      choiceTask({
        id: 'p-table-layout',
        prompt: 'What are HTML tables designed for?',
        options: ['Tabular data with rows and columns', 'Page layout and positioning', 'Styling text'],
        answer: 0,
        hints: ['Think spreadsheets.'],
        explanation: 'Layout tables are an old anti-pattern — modern pages use CSS for structure.',
      }),
    ],
    quiz: [
      question(
        'Which element contains the table\'s data cells?',
        ['`<tr>`', '`<td>`', '`<th>`'],
        0,
        '<tr> is the row; cells live inside rows.',
      ),
      question(
        'What is `<caption>` for?',
        ['A title describing the table', 'A footer row', 'A column header'],
        0,
        'The caption gives the table a name that screen readers announce first.',
      ),
    ],
  }),

  lesson({
    id: 'table-headers',
    title: 'Table Headers and Structure',
    duration: 8,
    objectives: [
      'Add header cells with <th>',
      'Group rows with <thead> and <tbody>',
      'Use scope for accessibility',
    ],
    sections: [
      para('Real tables distinguish **headers** from **data**. Header cells use `<th>`, which browsers bold and centre by default:'),
      codeExample(
        '<table>\n  <caption>Course progress</caption>\n  <thead>\n    <tr>\n      <th scope="col">Course</th>\n      <th scope="col">Progress</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <th scope="row">HTML</th>\n      <td>80%</td>\n    </tr>\n    <tr>\n      <th scope="row">CSS</th>\n      <td>45%</td>\n    </tr>\n  </tbody>\n</table>',
        'Headers above, body rows below — the shape of a real data table.',
      ),
      list([
        '`scope="col"` — this cell heads the column below it.',
        '`scope="row"` — this cell heads the row beside it.',
        '`<thead>` / `<tbody>` — group rows logically.',
        '`<tfoot>` — summary or totals row.',
      ]),
      keyPoint('`scope` is how a screen reader knows which header belongs to which cell. Without it, someone hearing "80%" gets no context.'),
      tip('One `<caption>` per table, one `<thead>` per table, and every table needs at least one header.'),
    ],
    takeaways: [
      '`<th>` marks header cells; `<td>` marks data.',
      '`scope` links headers to their cells.',
      '`<thead>`/`<tbody>` group rows and help styling.',
    ],
    task: {
      brief: 'Upgrade this table: move the top row into `<thead>` using `<th scope="col">` cells, add a `<tbody>` for the data, and add row headers with `scope="row"`.',
      starter: '<table>\n  <caption>Weekly goals</caption>\n  <tr>\n    <td>Day</td>\n    <td>Minutes</td>\n  </tr>\n  <tr>\n    <td>Monday</td>\n    <td>45</td>\n  </tr>\n</table>',
      checks: [
        { pattern: '<thead.*</thead>', flags: 'i', message: 'Wrap the header row in <thead>…</thead>.' },
        { pattern: '<th[^>]*scope="col"', message: 'Use <th scope="col"> for the column headers.' },
        { pattern: '<tbody.*</tbody>', flags: 'i', message: 'Wrap the data rows in <tbody>…</tbody>.' },
        { pattern: '<td>Day</td>', not: true, message: 'The header cells should be <th>, not <td>.' },
      ],
      solution: '<table>\n  <caption>Weekly goals</caption>\n  <thead>\n    <tr>\n      <th scope="col">Day</th>\n      <th scope="col">Minutes</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <th scope="row">Monday</th>\n      <td>45</td>\n    </tr>\n  </tbody>\n</table>',
    },
    practice: [
      fillBlank({
        id: 'p-th-tag',
        prompt: 'Header cells in a table use `<____>` rather than `<td>`.',
        blanks: [['th']],
        hints: ['Short for "table header".'],
        explanation: 'th cells are announced as headers and styled bold by default.',
      }),
      choiceTask({
        id: 'p-scope-col',
        prompt: 'What does `scope="col"` tell a screen reader?',
        options: [
          'This header applies to the cells below it',
          'This cell contains a number',
          'This column is the last one',
        ],
        answer: 0,
        hints: ['Read it as "this header owns the column".'],
        explanation: 'scope connects each data cell to its header so values are announced with context.',
      }),
    ],
    quiz: [
      question(
        'Which element groups the header rows?',
        ['`<thead>`', '`<header>`', '`<tbody>`'],
        0,
        '<thead> is table-specific; <header> is a page landmark.',
      ),
      question(
        'Why add `scope` to `<th>`?',
        ['To link headers with their cells', 'To bold the text', 'To sort the column'],
        0,
        'scope gives assistive technology the header/cell relationship.',
      ),
    ],
  }),
]
