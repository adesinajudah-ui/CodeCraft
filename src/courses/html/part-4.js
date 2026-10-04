import {
  para, list, codeExample, tip, keyPoint, warning, note, table,
  question, fillBlank, choiceTask, reorderTask, codeTask, lesson,
} from '../content-helpers.js'

// Modules 9–10 — HTML Best Practices, Final Project

export const part4Lessons = [
  lesson({
    id: 'comments',
    title: 'Comments',
    duration: 6,
    objectives: [
      'Write HTML comments',
      'Explain when commenting helps',
      'Know that comments are invisible to visitors',
    ],
    sections: [
      para('Comments are notes for humans. The browser ignores them completely.'),
      codeExample(
        '<!-- Hero section starts here -->\n<header>\n  <h1>CodeCraft</h1>\n</header>\n\n<!-- TODO: add the pricing table on Friday -->',
      ),
      list([
        'Comments never appear in the rendered page.',
        'They still show up in "View source" — never paste secrets there.',
        'Useful for marking sections, explaining decisions, or temporarily disabling code.',
      ]),
      keyPoint('Comment the *why*, not the *what*. "Uses a relative path so the site works offline" is useful; "opens a link" is noise.'),
      warning('Do not leave large blocks of commented-out code in a real project — version control is the right place for old code.'),
    ],
    takeaways: [
      '`<!-- like this -->` is a comment.',
      'Comments are invisible to visitors but visible in source.',
      'Explain reasoning, not obvious syntax.',
    ],
    task: {
      brief: 'Add three comments: one labelling the header, one explaining why the image uses a relative path, and one TODO for later.',
      starter: '<header>\n  <h1>Weekend projects</h1>\n</header>\n<main>\n  <img src="images/hero.jpg" alt="Workshop bench">\n</main>',
      checks: [
        { pattern: '<!--[^-]{10,}-->', message: 'Add at least one comment with a real note inside.' },
        { pattern: '(?s)<!--.*<header>', flags: 'i', message: 'Put a comment above the header.' },
        { pattern: 'TODO', message: 'Add a TODO comment for future work.' },
      ],
      solution: '<!-- Page header: brand and main title -->\n<header>\n  <h1>Weekend projects</h1>\n</header>\n<main>\n  <!-- Relative path so the page also works when opened offline -->\n  <img src="images/hero.jpg" alt="Workshop bench">\n  <!-- TODO: add a gallery section before publishing -->\n</main>',
    },
    practice: [
      fillBlank({
        id: 'p-comment-syntax',
        prompt: 'An HTML comment looks like `<!-- anything ____ -->`.',
        blanks: [['here', 'inside']],
        hints: ['It opens with two dashes after the opening bracket.'],
        explanation: 'Everything between <!-- and --> is skipped by the browser.',
      }),
      choiceTask({
        id: 'p-comment-purpose',
        prompt: 'What is the best use of a comment?',
        options: [
          'Explaining a non-obvious decision for future readers',
          'Hiding text from the page but keeping it for SEO',
          'Styling text in a different colour',
        ],
        answer: 0,
        hints: ['Who actually reads comments?'],
        explanation: 'Comments are for developers. Hidden text tricks do not work — crawlers see comments as low-value spam.',
      }),
    ],
    quiz: [
      question(
        'Do visitors see HTML comments on the page?',
        ['No — only in the page source', 'Yes, in italics', 'Only when logged in'],
        0,
        'Comments are stripped during rendering but remain in the source.',
      ),
      question(
        'Which is a valid comment?',
        ['`<!-- helpful note -->`', '`// helpful note`', '`** helpful note **`'],
        0,
        'HTML uses <!-- … -->, not JavaScript or CSS comment styles.',
      ),
    ],
  }),

  lesson({
    id: 'nesting',
    title: 'Nesting Elements Correctly',
    duration: 8,
    objectives: [
      'Close elements in the right order',
      'Fix overlapping tags',
      'Understand how browsers repair bad markup',
    ],
    sections: [
      para('Nested elements must close **inside out** — the last element opened is the first one closed:'),
      codeExample(
        '<p>Learn <strong>semantic <em>HTML</em></strong> today.</p>\n\n<!-- Closes: </em> → </strong> → </p> -->',
      ),
      codeExample(
        '<!-- WRONG: the tags overlap -->\n<p>This is <strong>bold text.</p></strong>\n\n<!-- RIGHT: every element closes inside its parent -->\n<p>This is <strong>bold text.</strong></p>',
      ),
      keyPoint('Browsers try to fix broken markup by guessing where tags end — and their guesses often produce strange layouts you did not intend.'),
      warning('Overlapping tags are the single most common source of "why is the rest of my page bold?" bugs.'),
      tip('Good editors indent nested elements, which makes ordering mistakes obvious at a glance.'),
    ],
    takeaways: [
      'Close in reverse order of opening.',
      'Never let two elements overlap.',
      'Indent your code so mistakes are visible.',
    ],
    task: {
      brief: 'Fix the broken markup: the tags overlap. Reorder the closing tags so every element closes inside the element that contains it, then run the code to confirm the styling is contained.',
      starter: '<h2>Fix me</h2>\n<p>This sentence has <strong>bold text.</p></strong>\n<p>Nested <em>emphasis <strong>done right</strong></em> stays tidy.</p>',
      checks: [
        { pattern: '<strong>bold text[.][ ]*</strong></p>', flags: 'i', message: 'Close <strong> before </p>.' },
        { pattern: '</p></strong>', not: true, message: 'Remove the misplaced </strong> that comes after </p>.' },
        { pattern: '<p>', message: 'Keep both paragraphs.' },
      ],
      solution: '<h2>Fix me</h2>\n<p>This sentence has <strong>bold text.</strong></p>\n<p>Nested <em>emphasis <strong>done right</strong></em> stays tidy.</p>',
    },
    practice: [
      reorderTask({
        id: 'p-close-order',
        prompt: 'Arrange these so the document closes correctly (openings first, closings in reverse).',
        fragments: ['</strong>', '<p>', '<strong>', '</p>'],
        answer: ['<p>', '<strong>', '</strong>', '</p>'],
        hints: ['Open <p>, then open <strong>.', 'Close the inner element first.'],
        explanation: 'Correct: <p><strong>text</strong></p>. The inner element always closes before its parent.',
      }),
      fillBlank({
        id: 'p-inside-out',
        prompt: 'When closing nested elements, the _______ element closes first.',
        blanks: [['inner', 'innermost', 'last opened', 'most recent']],
        hints: ['Think of closing a set of boxes.'],
        explanation: 'Reverse order of opening: last in, first out.',
      }),
    ],
    quiz: [
      question(
        'Which is correct?',
        ['`<strong><em>hi</em></strong>`', '`<strong><em>hi</strong></em>`', '`<strong>hi</em>`'],
        0,
        'The element opened last must close first.',
      ),
      question(
        'What happens when tags overlap?',
        ['The browser guesses where elements end', 'Nothing changes', 'The page refuses to load'],
        0,
        'Repair algorithms (the DOM "error console" of old) silently restructure your content.',
      ),
    ],
  }),

  lesson({
    id: 'common-mistakes',
    title: 'Common HTML Mistakes',
    duration: 9,
    objectives: [
      'Spot the mistakes beginners make most often',
      'Debug a broken document',
      'Apply a pre-publish checklist',
    ],
    sections: [
      para('Every new developer meets these bugs. Learning to recognise them saves hours:'),
      table(
        ['Mistake', 'Symptom', 'Fix'],
        [
          ['Missing closing tag', 'Everything after it inherits the style', 'Close every element you open'],
          ['Missing `alt`', 'Screen readers say "image"', 'Describe the image'],
          ['Duplicate `id`', 'Labels and scripts target the wrong element', 'Make ids unique'],
          ['Heading soup', 'No usable outline', 'One h1, then descend logically'],
          ['Layout table', 'Awful on mobile', 'Use CSS for layout'],
          ['Missing viewport', 'Tiny text on phones', 'Add the viewport meta tag'],
        ],
      ),
      codeExample(
        '<!-- Broken: duplicate ids, missing alt, skipped heading -->\n<h1>Shop</h1>\n<h4>Deals</h4>\n<img src="sale.jpg">\n<input id="search" name="search">\n<input id="search" name="filter">',
      ),
      keyPoint('A quick pre-publish checklist: DOCTYPE, lang, charset, viewport, title, one h1, alt on images, unique ids, no overlapping tags.'),
      tip('Paste your markup into the W3C HTML validator — it points straight at structural mistakes.'),
    ],
    takeaways: [
      'Unclosed and duplicated tags cause most layout bugs.',
      'Ids must be unique; every image needs alt.',
      'Validate before publishing.',
    ],
    task: {
      brief: 'Repair this page: add the missing image `alt`, remove the duplicate `id`, fix the heading order (h1 → h2), and close the unclosed paragraph.',
      starter: '<h1>Shop</h1>\n<h4>Deals of the week</h4>\n<img src="sale.jpg">\n<p>We have discounted courses\n<input id="code" name="code">\n<input id="code" name="coupon">',
      checks: [
        { pattern: '<img[^>]*alt="[^"]{5,}"', message: 'Add descriptive alt text to the image.' },
        { pattern: '<h2>', message: 'Change the <h4> to an <h2> so headings do not skip.' },
        { pattern: '(?s)<p>.*</p>', flags: 'i', message: 'Close the paragraph with </p>.' },
        { pattern: 'id="code"', maxMatches: 1, message: 'Keep only one element with id="code" (rename or remove the duplicate).' },
      ],
      solution: '<h1>Shop</h1>\n<h2>Deals of the week</h2>\n<img src="sale.jpg" alt="Discount sticker showing 50% off">\n<p>We have discounted courses on sale this week.</p>\n<input id="code" name="code">\n<input id="coupon" name="coupon">',
    },
    practice: [
      choiceTask({
        id: 'p-duplicate-id',
        prompt: 'Two elements share `id="email"`. What breaks?',
        options: [
          'Labels and scripts can only find the first one',
          'The page will not validate as UTF-8',
          'Nothing — ids can repeat',
        ],
        answer: 0,
        hints: ['An id is supposed to be a unique identifier.'],
        explanation: 'document.getElementById returns the first match, so the second field silently loses its label association.',
      }),
      choiceTask({
        id: 'p-skipped-heading',
        prompt: 'A page goes <h1> → <h3> with no <h2>. What is the problem?',
        options: [
          'The document outline skips a level, confusing navigation',
          'The h3 renders invisible',
          'Nothing — sizes are what matter',
        ],
        answer: 0,
        hints: ['Think about the structure, not the font size.'],
        explanation: 'Screen reader users navigate by heading level; gaps make them think content is missing.',
      }),
    ],
    quiz: [
      question(
        'A missing closing `</p>` usually causes…',
        ['Following content to be swallowed into the paragraph', 'A crash', 'A CSS error'],
        0,
        'The parser extends the paragraph until it finds a natural end.',
      ),
      question(
        'Which is a valid pre-publish check?',
        ['Run the markup through a validator', 'Turn off the viewport tag', 'Repeat ids for consistency'],
        0,
        'Validators catch structural errors you have stopped noticing.',
      ),
    ],
  }),

  lesson({
    id: 'accessibility',
    title: 'Accessibility Essentials',
    duration: 9,
    objectives: [
      'Apply the core accessibility rules of HTML',
      'Write alt text and labels consistently',
      'Check keyboard operability',
    ],
    sections: [
      para('Accessibility (often shortened to **a11y**) means your page works for everyone — including people using screen readers, keyboards, or small screens.'),
      list([
        '**`lang` on `<html>`** so the page is pronounced correctly.',
        '**One `<h1>`** and a logical heading order.',
        '**Alt text** for meaningful images, `alt=""` for decorative ones.',
        '**Labels** paired with every form field.',
        '**Real elements** — links that go somewhere, buttons that do something.',
        '**Keyboard access** — everything reachable with Tab, with a visible focus style.',
        '**Colour is not the only signal** — pair it with text or icons.',
      ]),
      codeExample(
        '<html lang="en">\n  <h1>Sign in</h1>\n  <img src="logo.png" alt="CodeCraft home">\n  <label for="email">Email address</label>\n  <input type="email" id="email" name="email" required>\n  <button type="submit">Sign in</button>\n</html>',
        'A small form that a screen reader user can complete without guessing.',
      ),
      keyPoint('Most accessibility costs nothing: correct tags you already know. It is the cheapest quality you will ever ship.'),
      warning('Never remove the focus outline (`outline: none`) without providing an equally visible replacement — keyboard users lose track of where they are.'),
      note('Approximately one in six people has a disability. Accessible HTML helps far more people than you might think — including temporary situations like a broken wrist or a bright sunny screen.'),
    ],
    takeaways: [
      'Semantic structure + labels + alt text covers most of it.',
      'Keyboard support is a requirement, not a bonus.',
      'Accessibility is built from small, consistent habits.',
    ],
    task: {
      brief: 'Make this sign-in form accessible: add `lang="en"` to `<html>`, a real `<label for>` for the input, descriptive `alt` on the logo, and a heading hierarchy of h1 → h2.',
      starter: '<html>\n<div>Sign in</div>\n<img src="logo.png">\n<input type="email" name="email">\n<div>First time here?</div>\n</html>',
      checks: [
        { pattern: '<html[^>]*lang="[a-z]{2}"', message: 'Add lang="en" (or another language code) to <html>.' },
        { pattern: '<label[^>]*for="email"', message: 'Add a <label for="email">.' },
        { pattern: '<input[^>]*id="email"', message: 'Give the input id="email" so the label matches.' },
        { pattern: '<img[^>]*alt="[^"]{3,}"', message: 'Add alt text to the logo.' },
        { pattern: '<h1>', message: 'Use an <h1> for the page title.' },
      ],
      solution: '<html lang="en">\n<body>\n  <h1>Sign in</h1>\n  <img src="logo.png" alt="CodeCraft home">\n  <label for="email">Email address</label>\n  <input type="email" id="email" name="email" required>\n  <h2>First time here?</h2>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-focus-outline',
        prompt: 'What happens if you remove focus styles with no replacement?',
        options: [
          'Keyboard users cannot see where they are',
          'The page loads faster',
          'Mouse users are affected too',
        ],
        answer: 0,
        hints: ['How do you know which button Tab is on?'],
        explanation: 'A visible focus indicator is essential for keyboard-only navigation.',
      }),
      fillBlank({
        id: 'p-lang-attr',
        prompt: 'The page language is declared on `<html ______="en">`.',
        blanks: [['lang']],
        hints: ['It is short for "language".'],
        explanation: 'Screen readers switch pronunciation rules based on lang.',
      }),
    ],
    quiz: [
      question(
        'Which combination makes a form field accessible?',
        ['A label linked by `for`/`id`', 'A placeholder only', 'A bold caption above it'],
        0,
        'The label association is what gets announced on focus.',
      ),
      question(
        'What does `alt=""` communicate?',
        ['This image is decorative — skip it', 'The image is broken', 'The image is transparent'],
        0,
        'An empty alt deliberately removes the image from the accessibility tree.',
      ),
    ],
  }),

  lesson({
    id: 'profile-page',
    title: 'Build a Personal Profile Page',
    duration: 15,
    objectives: [
      'Combine everything into one complete page',
      'Structure a profile with semantic elements',
      'Check accessibility as you build',
    ],
    sections: [
      para('Time to build. Your profile page needs: a header with your name, a photo with alt text, an "About" section, a skills list, and contact links.'),
      codeExample(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Alex — Profile</title>\n</head>\n<body>\n  <header>\n    <h1>Alex Morgan</h1>\n    <p>Aspiring front-end developer</p>\n  </header>\n  <main>\n    <img src="photo.jpg" alt="Portrait of Alex smiling">\n    <section>\n      <h2>About me</h2>\n      <p>I am learning to build for the web…</p>\n    </section>\n  </main>\n  <footer>\n    <a href="mailto:alex@example.com">Email me</a>\n  </footer>\n</body>\n</html>',
        'A complete, semantic profile page.',
      ),
      list([
        'Start from the full document skeleton (DOCTYPE, html, head, body).',
        'Use `<header>`, `<main>`, `<section>`, `<footer>` — no layout divs.',
        'Give every image an `alt` and every link descriptive text.',
        'Check heading order: h1 → h2.',
      ]),
      keyPoint('Small pages are where habits form. Build this one properly and every larger project inherits the discipline.'),
      tip('Run the code after each change — small steps make bugs easy to spot.'),
    ],
    takeaways: [
      'Combine structure, semantics and accessibility in one file.',
      'Headings, landmarks and alt text are not optional extras.',
      'Test as you go, not at the end.',
    ],
    task: {
      brief: 'Build a complete personal profile page: a `<header>` with an `<h1>` name, an `<img>` with alt text, an `<h2>` "About" section inside `<main>`, a `<ul>` of three skills, and an email link in the `<footer>`.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My profile</title>\n</head>\n<body>\n</body>\n</html>',
      checks: [
        { pattern: '<header.*</header>', flags: 'i', message: 'Add a <header> containing your name.' },
        { pattern: '<h1>[^<]{3,}</h1>', message: 'Put your name in an <h1>.' },
        { pattern: '<img[^>]*alt="[^"]{5,}"', message: 'Add an <img> with descriptive alt text.' },
        { pattern: '<main.*</main>', flags: 'i', message: 'Put the about section inside <main>.' },
        { pattern: '<h2>', message: 'Add an <h2> section heading.' },
        { pattern: '<ul.*<li>.*<li>.*<li>', flags: 'i', message: 'List three skills in a <ul>.' },
        { pattern: '<a[^>]*href="mailto:', message: 'Add a mailto: link in the footer.' },
        { pattern: '<footer.*</footer>', flags: 'i', message: 'Add a <footer> with the contact link.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Sam Okafor — Profile</title>\n</head>\n<body>\n  <header>\n    <h1>Sam Okafor</h1>\n    <p>Student developer, learning one lesson at a time</p>\n  </header>\n  <main>\n    <img src="https://placehold.co/240x240" alt="Portrait photo of Sam smiling at the camera">\n    <section>\n      <h2>About me</h2>\n      <p>I discovered CodeCraft this year and I am building my first website.</p>\n    </section>\n    <section>\n      <h2>My skills</h2>\n      <ul>\n        <li>HTML</li>\n        <li>CSS basics</li>\n        <li>Writing clear documentation</li>\n      </ul>\n    </section>\n  </main>\n  <footer>\n    <a href="mailto:sam@example.com">Email me</a>\n  </footer>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-profile-landmarks',
        prompt: 'Which set are page landmarks?',
        options: [
          '`<header>`, `<main>`, `<footer>`',
          '`<b>`, `<i>`, `<u>`',
          '`<table>`, `<tr>`, `<td>`',
        ],
        answer: 0,
        hints: ['They describe regions of the page.'],
        explanation: 'Landmarks let assistive technology jump between regions directly.',
      }),
      fillBlank({
        id: 'p-profile-structure',
        prompt: 'A profile page must contain exactly one `<______>` element.',
        blanks: [['main']],
        hints: ['It holds the page’s unique content.'],
        explanation: 'header, main and footer together give the page a clear, navigable structure.',
      }),
    ],
    quiz: [
      question(
        'Where should your name appear on a profile page?',
        ['In an `<h1>` inside the header', 'In a `<title>` only', 'In an `<aside>`'],
        0,
        'The h1 is the visible page title; the title tag is the browser tab label.',
      ),
      question(
        'What makes the skills list meaningful?',
        ['It is a semantic `<ul>` with real `<li>` items', 'It uses bold text', 'It is inside a table'],
        0,
        'A list tells users (and machines) that these items belong together.',
      ),
    ],
  }),

  lesson({
    id: 'portfolio-page',
    title: 'Build a Portfolio Page',
    duration: 15,
    objectives: [
      'Structure multiple projects with <article>',
      'Add navigation with <nav>',
      'Lay out sections with headings',
    ],
    sections: [
      para('A portfolio shows your work. You will combine navigation, repeated project cards and a footer.'),
      codeExample(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My portfolio</title>\n</head>\n<body>\n  <header>\n    <h1>My Portfolio</h1>\n    <nav aria-label="Main">\n      <ul>\n        <li><a href="#projects">Projects</a></li>\n        <li><a href="#contact">Contact</a></li>\n      </ul>\n    </nav>\n  </header>\n  <main>\n    <section id="projects">\n      <h2>Projects</h2>\n      <article>\n        <h3>Weather dashboard</h3>\n        <p>A forecast app built with HTML and CSS.</p>\n      </article>\n    </section>\n  </main>\n  <footer id="contact">\n    <p><a href="mailto:me@example.com">Get in touch</a></p>\n  </footer>\n</body>\n</html>',
      ),
      list([
        'Each project is a self-contained `<article>` with its own heading.',
        'Anchor links (`#projects`) jump to a section with a matching `id`.',
        'Repeat the same structure for every project — consistency reads as professionalism.',
      ]),
      keyPoint('Repetition in structure is a feature: users learn your card layout once and can scan the rest quickly.'),
      tip('Give each `<section>` an `id` so your navigation links have real targets.'),
    ],
    takeaways: [
      'Projects belong in `<article>` elements inside sections.',
      'Anchor links need matching `id`s.',
      'Consistent structure makes portfolios easy to scan.',
    ],
    task: {
      brief: 'Build a portfolio with a `<nav>` of two anchor links, a projects `<section id="projects">` containing **two** `<article>` cards with `<h3>` titles, and a `<footer id="contact">` with an email link.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Portfolio</title>\n</head>\n<body>\n</body>\n</html>',
      checks: [
        { pattern: '<nav.*</nav>', flags: 'i', message: 'Add a <nav> with links.' },
        { pattern: '<section[^>]*id="projects"', message: 'Add <section id="projects">.' },
        { pattern: '<article.*<article', flags: 'i', message: 'Add two <article> project cards.' },
        { pattern: '(?s)<article>.*<h3>[^<]+</h3>', flags: 'i', message: 'Give each project an <h3> title.' },
        { pattern: '<footer[^>]*id="contact"', message: 'Add <footer id="contact">.' },
        { pattern: '<a[^>]*href="mailto:', message: 'Include a mailto: contact link.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Kim Lee — Portfolio</title>\n</head>\n<body>\n  <header>\n    <h1>Kim Lee</h1>\n    <nav aria-label="Main">\n      <ul>\n        <li><a href="#projects">Projects</a></li>\n        <li><a href="#contact">Contact</a></li>\n      </ul>\n    </nav>\n  </header>\n  <main>\n    <section id="projects">\n      <h2>Projects</h2>\n      <article>\n        <h3>Recipe finder</h3>\n        <p>A searchable collection of my favourite meals, built with HTML forms.</p>\n      </article>\n      <article>\n        <h3>Reading list</h3>\n        <p>A tidy list of everything I have read this year.</p>\n      </article>\n    </section>\n  </main>\n  <footer id="contact">\n    <p><a href="mailto:kim@example.com">Get in touch</a></p>\n  </footer>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-anchor-link',
        prompt: 'What does `<a href="#projects">` link to?',
        options: [
          'The element with id="projects" on the same page',
          'A file named #projects.html',
          'Nothing — # is decorative',
        ],
        answer: 0,
        hints: ['The # means "fragment" — jump within this page.'],
        explanation: 'A hash href scrolls to the matching id without loading a new page.',
      }),
      reorderTask({
        id: 'p-portfolio-order',
        prompt: 'Arrange the page regions in a sensible document order.',
        fragments: ['<main>', '<footer>', '<header>'],
        answer: ['<header>', '<main>', '<footer>'],
        hints: ['Branding first.', 'Contact details last.'],
        explanation: 'header → main → footer is the standard landmark order.',
      }),
    ],
    quiz: [
      question(
        'What element repeats for each project?',
        ['`<article>`', '`<aside>`', '`<form>`'],
        0,
        'Each project is self-contained, which is exactly what article means.',
      ),
      question(
        'How does a nav link reach the contact footer?',
        ['`href="#contact"` with `id="contact"` on the footer', '`href="contact"` only', '`name="contact"` on the nav'],
        0,
        'The hash target must match an id somewhere on the page.',
      ),
    ],
  }),

  lesson({
    id: 'final-challenge',
    title: 'Final HTML Challenge',
    duration: 20,
    objectives: [
      'Build a full page from an empty file',
      'Apply semantics, forms and media together',
      'Self-check against a specification',
    ],
    sections: [
      para('This is the real test: an empty file and a specification. Build the page described below, then check your work against the requirements.'),
      list([
        'A document skeleton with DOCTYPE, `lang`, charset and viewport.',
        'A `<header>` with an `<h1>` site title and a `<nav>` list of two links.',
        'A `<main>` containing an `<article>` with an `<h2>`, a paragraph, an image with alt text and an ordered list.',
        'A `<section>` with a table of at least two rows and a `<th>` header row.',
        'A form with a labelled text input and a submit button.',
        'A `<footer>` with an email link.',
      ]),
      codeExample(
        '<!-- Skeleton to start from -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Challenge</title>\n</head>\n<body>\n  <!-- build here -->\n</body>\n</html>',
      ),
      keyPoint('Work top to bottom, run the code after each region, and only then check the requirement list. Steady beats fast.'),
      tip('Stuck? Re-open earlier lessons in the curriculum — every technique you need has already been taught.'),
    ],
    takeaways: [
      'Plan the regions before writing tags.',
      'Semantics and accessibility apply at every scale.',
      'Verify against a checklist before moving on.',
    ],
    task: {
      brief: 'Build the complete challenge page. Hit every requirement in the list above: landmarks, nav, article, ordered list, image with alt, table with a header row, labelled form, and footer contact link.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Final challenge</title>\n</head>\n<body>\n</body>\n</html>',
      checks: [
        { pattern: '<header.*</header>', flags: 'i', message: 'Add a <header> with the site title.' },
        { pattern: '<nav.*<a.*<a', flags: 'i', message: 'Add a <nav> containing two links.' },
        { pattern: '<main.*</main>', flags: 'i', message: 'Wrap the content in <main>.' },
        { pattern: '<article.*</article>', flags: 'i', message: 'Add an <article>.' },
        { pattern: '<ol.*</ol>', flags: 'i', message: 'Include an ordered list inside the article.' },
        { pattern: '<img[^>]*alt="[^"]{5,}"', message: 'Add an image with descriptive alt text.' },
        { pattern: '<table.*<th.*</table>', flags: 'i', message: 'Add a table that includes <th> header cells.' },
        { pattern: '<label[^>]*for=', message: 'Add a <label for="…"> in the form.' },
        { pattern: '<button[^>]*type="submit"|<input[^>]*type="submit"', message: 'Add a submit control to the form.' },
        { pattern: '<footer.*<a[^>]*href="mailto:', flags: 'i', message: 'Add a <footer> with a mailto: link.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Final challenge — DevHub</title>\n</head>\n<body>\n  <header>\n    <h1>DevHub</h1>\n    <nav aria-label="Main">\n      <ul>\n        <li><a href="#articles">Articles</a></li>\n        <li><a href="#subscribe">Subscribe</a></li>\n      </ul>\n    </nav>\n  </header>\n  <main>\n    <article id="articles">\n      <h2>Weekly dev roundup</h2>\n      <p>Everything worth knowing from the world of web development this week.</p>\n      <img src="https://placehold.co/420x160" alt="Illustration of a laptop with code on screen">\n      <ol>\n        <li>HTML semantics are still evolving</li>\n        <li>CSS container queries landed everywhere</li>\n        <li>Native dialog elements simplify modals</li>\n      </ol>\n    </article>\n    <section>\n      <h2>Top languages</h2>\n      <table>\n        <caption>Popularity among our readers</caption>\n        <tr>\n          <th scope="col">Language</th>\n          <th scope="col">Share</th>\n        </tr>\n        <tr>\n          <td>JavaScript</td>\n          <td>64%</td>\n        </tr>\n        <tr>\n          <td>Python</td>\n          <td>51%</td>\n        </tr>\n      </table>\n    </section>\n    <section id="subscribe">\n      <h2>Subscribe</h2>\n      <form action="/subscribe" method="post">\n        <label for="email">Email address</label>\n        <input type="email" id="email" name="email" required>\n        <button type="submit">Subscribe</button>\n      </form>\n    </section>\n  </main>\n  <footer>\n    <p><a href="mailto:hello@devhub.example">hello@devhub.example</a></p>\n  </footer>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-final-audit',
        prompt: 'Your page uses `<div class="header">` instead of `<header>`. What should you change?',
        options: [
          'Replace it with the semantic <header> element',
          'Nothing — they are equivalent',
          'Add more classes to the div',
        ],
        answer: 0,
        hints: ['Which one tells assistive technology what it is?'],
        explanation: 'Semantic elements expose the structure directly; divs hide it behind class names nobody else can read.',
      }),
    ],
    quiz: [
      question(
        'Which requirement is NOT part of the challenge spec?',
        ['A video player with autoplay', 'A labelled form with a submit button', 'A header, nav and footer'],
        0,
        'Autoplaying media is discouraged — the spec asks for semantics, not noise.',
      ),
      question(
        'What should you do after finishing the page?',
        ['Check it against the requirement list', 'Delete the DOCTYPE', 'Remove all alt attributes'],
        0,
        'A quick self-audit catches the omissions that are easy to miss while building.',
      ),
    ],
  }),

  lesson({
    id: 'course-assessment',
    title: 'Course Assessment',
    duration: 12,
    objectives: [
      'Demonstrate everything you have learned',
      'Pass the course assessment with 70% or higher',
      'Complete the course to earn your certificate',
    ],
    sections: [
      para('The assessment has two parts: build one final page against a checklist, then answer **five questions** covering the whole course.'),
      para('To pass, your quiz score must reach **70%**. You can retake it as often as you like — every attempt shows you what to review.'),
      list([
        'Part 1 — the page: header, nav, main, article, image with alt, list, table, labelled form, footer link.',
        'Part 2 — five questions on structure, links, images, forms and semantics.',
        'Passing marks the course complete and unlocks your certificate.',
      ]),
      codeExample(
        '<!-- Aim for something like this structure -->\n<header>…</header>\n<main>\n  <article>…</article>\n  <section>…</section>\n</main>\n<footer>…</footer>',
        'Your assessment page should read like a finished, semantic document.',
      ),
      keyPoint('Read each question fully before answering — a surprising number of them hinge on one word such as "NOT" or "first".'),
      tip('Review any lesson you are unsure about, then come back. Progress is saved automatically.'),
    ],
    takeaways: [
      'Pass the quiz with 70% to complete the course.',
      'Semantics, accessibility and valid structure are the core of HTML.',
      'Completing the course unlocks the certificate.',
    ],
    task: {
      brief: 'Build the assessment page: a header with an h1, a nav with two links, a main containing an article (h2 + paragraph + image with alt + unordered list), a table with a th row, a labelled form with a submit button, and a footer email link.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Assessment</title>\n</head>\n<body>\n</body>\n</html>',
      checks: [
        { pattern: '<header.*<h1>', flags: 'i', message: 'Add a header containing an <h1>.' },
        { pattern: '<nav.*<a', flags: 'i', message: 'Add a nav with at least one link (two are required).' },
        { pattern: '(?s)<main.*<article.*</article>.*</main>', flags: 'i', message: 'Put an <article> inside <main>.' },
        { pattern: '<img[^>]*alt="[^"]{5,}"', message: 'Add an image with descriptive alt text.' },
        { pattern: '<ul.*</ul>', flags: 'i', message: 'Include an unordered list.' },
        { pattern: '<table.*<th', flags: 'i', message: 'Include a table with <th> headers.' },
        { pattern: '<label[^>]*for=', message: 'Add a label associated with the form input.' },
        { pattern: '<button[^>]*type="submit"|<input[^>]*type="submit"', message: 'Add a submit control.' },
        { pattern: '<footer.*<a[^>]*href="mailto:', flags: 'i', message: 'Add a footer with a mailto: link.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Assessment — My learning journal</title>\n</head>\n<body>\n  <header>\n    <h1>My learning journal</h1>\n    <nav aria-label="Main">\n      <ul>\n        <li><a href="#entries">Entries</a></li>\n        <li><a href="#contact">Contact</a></li>\n      </ul>\n    </nav>\n  </header>\n  <main>\n    <article id="entries">\n      <h2>What I learned about HTML</h2>\n      <p>HTML gives a page structure, meaning and accessibility for free.</p>\n      <img src="https://placehold.co/400x140" alt="Notebook page filled with HTML snippets">\n      <ul>\n        <li>Headings create an outline</li>\n        <li>Semantic landmarks aid navigation</li>\n        <li>Forms need labels and names</li>\n      </ul>\n    </article>\n    <section>\n      <h2>Course results</h2>\n      <table>\n        <caption>Module scores</caption>\n        <tr>\n          <th scope="col">Module</th>\n          <th scope="col">Score</th>\n        </tr>\n        <tr>\n          <td>Structure</td>\n          <td>90%</td>\n        </tr>\n      </table>\n    </section>\n    <section>\n      <h2>Feedback</h2>\n      <form action="/feedback" method="post">\n        <label for="msg">Your feedback</label>\n        <input type="text" id="msg" name="msg" required>\n        <button type="submit">Send</button>\n      </form>\n    </section>\n  </main>\n  <footer id="contact">\n    <p><a href="mailto:student@example.com">Email the author</a></p>\n  </footer>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-assessment-pass',
        prompt: 'What score do you need on this assessment to complete the course?',
        options: ['70%', '50%', '100%'],
        answer: 0,
        hints: ['Check the requirement at the top of this lesson.'],
        explanation: '70% or higher passes. Retakes are unlimited, so review the explanations and try again.',
      }),
    ],
    quiz: [
      question(
        'Which element creates the main page heading?',
        ['`<h1>`', '`<header>`', '`<title>`'],
        0,
        'One h1 per page states the page’s topic.',
      ),
      question(
        'What does the `href` attribute do on an `<a>` element?',
        ['Sets the link destination', 'Sets the link text', 'Opens a new window'],
        0,
        'The text between the tags is the visible anchor; href is where it goes.',
      ),
      question(
        'Which element is a void element?',
        ['`<img>`', '`<p>`', '`<div>`'],
        0,
        'Images have no content and never close.',
      ),
      question(
        'How do you link a label to an input?',
        ['label `for` matches input `id`', 'label `for` matches input `name`', 'They must be nested'],
        0,
        'for="email" ↔ id="email" is the required pairing.',
      ),
      question(
        'Which is the correct landmark structure for a page?',
        ['`<header>` + `<main>` + `<footer>`', '`<head>` + `<body>` + `<aside>`', '`<section>` + `<span>` + `<b>`'],
        0,
        'header, main and footer are the three top-level landmarks every page uses.',
      ),
    ],
  }),
]
