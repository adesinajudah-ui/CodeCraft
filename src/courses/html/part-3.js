import {
  para, list, codeExample, tip, keyPoint, warning, note, table,
  question, fillBlank, choiceTask, reorderTask, codeTask, lesson,
} from '../content-helpers.js'

// Modules 7–8 — Forms and User Input, Semantic HTML

export const part3Lessons = [
  lesson({
    id: 'forms',
    title: 'Creating Forms',
    duration: 9,
    objectives: [
      'Build a form with <form>',
      'Add text inputs and a submit button',
      'Understand action and method',
    ],
    sections: [
      para('Forms collect information from visitors — logins, searches, sign-ups, feedback.'),
      codeExample(
        '<form action="/subscribe" method="post">\n  <label for="email">Email</label>\n  <input type="email" id="email" name="email">\n  <button type="submit">Subscribe</button>\n</form>',
      ),
      list([
        '`action` — where the data is sent (a URL or server route).',
        '`method` — `get` for searching, `post` for sending/creating data.',
        '`name` on each input — the key the server receives (`email=…`).',
        '`<button type="submit">` — sends the form.',
      ]),
      keyPoint('An input **without a `name`** is never sent to the server — the most common "my form does nothing" bug.'),
      warning('Never put a password in a `get` URL: it ends up in browser history and server logs. Use `method="post"`.'),
      note('Front-end validation improves the experience, but the server must always validate again — anyone can bypass the browser.'),
    ],
    takeaways: [
      '`<form>` + inputs + a submit button = a working form.',
      '`name` is what makes an input sendable.',
      '`method="post"` for data that changes the server.',
    ],
    task: {
      brief: 'Build a feedback form: a text input for the visitor\'s name (`name="name"`), a textarea for the message (`name="message"`), and a submit button.',
      starter: '<h2>Send feedback</h2>\n<form>\n</form>',
      checks: [
        { pattern: '<input[^>]*name="name"', message: 'Add <input type="text" name="name">.' },
        { pattern: '<textarea[^>]*name="message"', message: 'Add a <textarea name="message">.' },
        { pattern: '<button[^>]*type="submit"', message: 'Add a <button type="submit"> to send it.' },
        { pattern: '<form.*</form>', flags: 'i', message: 'Keep everything inside the <form> element.' },
      ],
      solution: '<h2>Send feedback</h2>\n<form action="/feedback" method="post">\n  <label for="name">Your name</label>\n  <input type="text" id="name" name="name">\n  <label for="message">Message</label>\n  <textarea id="message" name="message"></textarea>\n  <button type="submit">Send feedback</button>\n</form>',
    },
    practice: [
      fillBlank({
        id: 'p-form-method',
        prompt: 'To send data that changes the server, use `method="______"`.',
        blanks: [['post']],
        hints: ['The other option is "get", which reads data.'],
        explanation: 'POST adds or updates data on the server; GET requests a page and puts parameters in the URL.',
      }),
      choiceTask({
        id: 'p-name-required',
        prompt: 'Why does an input need a `name`?',
        options: [
          'Without it, its value is never sent to the server',
          'It sets the placeholder text',
          'It is only needed for accessibility',
        ],
        answer: 0,
        hints: ['The server receives data as key/value pairs.'],
        explanation: 'name becomes the key (name="email" → email=user@example.com). id does not do this.',
      }),
    ],
    quiz: [
      question(
        'Which attribute decides where the form data is sent?',
        ['`action`', '`target`', '`for`'],
        0,
        'action points at the URL or route that processes the submission.',
      ),
      question(
        'Which method should a login form use?',
        ['`post`', '`get`', '`delete`'],
        0,
        'POST keeps credentials out of the URL, history and logs.',
      ),
    ],
  }),

  lesson({
    id: 'input-types',
    title: 'Input Types',
    duration: 9,
    objectives: [
      'Choose the right input type',
      'Use checkboxes and radio buttons',
      'Gain free browser validation',
    ],
    sections: [
      para('The `type` attribute turns a generic text box into something smarter:'),
      table(
        ['`type`', 'What the user gets'],
        [
          ['`text`', 'Single-line text'],
          ['`email`', 'Email keyboard + format check'],
          ['`password`', 'Hidden characters'],
          ['`number`', 'Numbers, with +/- controls'],
          ['`date`', 'Native date picker'],
          ['`checkbox`', 'Tick box (multiple allowed)'],
          ['`radio`', 'One choice from a group'],
          ['`range`', 'Slider'],
        ],
      ),
      codeExample(
        '<label for="age">Age</label>\n<input type="number" id="age" name="age" min="13" step="1">\n\n<input type="checkbox" id="terms" name="terms">\n<label for="terms">I accept the terms</label>\n\n<input type="radio" id="beginner" name="level" value="beginner">\n<label for="beginner">Beginner</label>',
      ),
      keyPoint('Inputs in the same radio group must share the **same `name`** — that is what makes them mutually exclusive.'),
      tip('Pick the most specific `type` available: you get mobile keyboards and built-in validation for free.'),
    ],
    takeaways: [
      '`type` controls keyboard, validation and behaviour.',
      'Radio buttons in one group share a `name`.',
      'Specific types = better mobile UX.',
    ],
    task: {
      brief: 'Create a short sign-up form containing: an `email` input, a `password` input, a checkbox for terms, and two radio buttons (Beginner / Advanced) sharing the name `level`.',
      starter: '<h2>Create your account</h2>\n<form>\n</form>',
      checks: [
        { pattern: '<input[^>]*type="email"', message: 'Add an input with type="email".' },
        { pattern: '<input[^>]*type="password"', message: 'Add an input with type="password".' },
        { pattern: '<input[^>]*type="checkbox"', message: 'Add a checkbox for the terms.' },
        { pattern: '<input[^>]*type="radio"[^>]*name="level"', message: 'Add radio buttons with name="level".' },
      ],
      solution: '<h2>Create your account</h2>\n<form action="/signup" method="post">\n  <label for="email">Email</label>\n  <input type="email" id="email" name="email" required>\n  <label for="password">Password</label>\n  <input type="password" id="password" name="password" required>\n  <input type="checkbox" id="terms" name="terms">\n  <label for="terms">I accept the terms</label>\n  <input type="radio" id="beginner" name="level" value="beginner">\n  <label for="beginner">Beginner</label>\n  <input type="radio" id="advanced" name="level" value="advanced">\n  <label for="advanced">Advanced</label>\n  <button type="submit">Sign up</button>\n</form>',
    },
    practice: [
      choiceTask({
        id: 'p-radio-name',
        prompt: 'Why do both radio buttons use `name="level"`?',
        options: [
          'So selecting one deselects the other',
          'So both values are sent twice',
          'It is only for styling',
        ],
        answer: 0,
        hints: ['Only one radio in a group can be chosen at a time.'],
        explanation: 'The shared name defines the group; the browser then enforces "one of these".',
      }),
      fillBlank({
        id: 'p-email-type',
        prompt: 'The input type that validates an email address is `type="_____"`.',
        blanks: [['email']],
        hints: ['Same word as the attribute you use to send one.'],
        explanation: 'type="email" shows a useful mobile keyboard and blocks submissions without an @ sign.',
      }),
    ],
    quiz: [
      question(
        'Which input type hides what the user is typing?',
        ['`password`', '`hidden`', '`text`'],
        0,
        'password masks the characters. hidden is an invisible field for scripts.',
      ),
      question(
        'How do you limit a number input to a minimum value?',
        ['`min="13"`', '`limit="13"`', '`lowest="13"`'],
        0,
        'min (and max) set the accepted range; step sets the increment.',
      ),
    ],
  }),

  lesson({
    id: 'labels',
    title: 'Labels and Placeholders',
    duration: 8,
    objectives: [
      'Associate a <label> with its input using for/id',
      'Explain why placeholders are not labels',
      'Improve form accessibility',
    ],
    sections: [
      para('A **label** tells the visitor what a field is for — and gives assistive technology a name for it.'),
      codeExample(
        '<label for="username">Username</label>\n<input type="text" id="username" name="username">',
        'The label’s for matches the input’s id — always.',
      ),
      para('Clicking the label focuses its input, which makes the whole row a comfortable tap target on mobile.'),
      list([
        '`for` on the label must equal the `id` on the input.',
        '`id` values must be unique across the page.',
        'Placeholder = temporary hint only; it disappears when you type.',
        'Placeholders usually have poor contrast — never rely on them alone.',
      ]),
      keyPoint('Placeholder is a hint, label is the question. Forms need labels — screen readers announce the label when the field gets focus.'),
      warning('`name` and `id` are different: `name` identifies data for the server, `id` identifies the element for labels and scripts.'),
    ],
    takeaways: [
      'Every input needs a `<label for="…">` matching its `id`.',
      'Placeholders do not replace labels.',
      '`name` = data key, `id` = element identity.',
    ],
    task: {
      brief: 'Fix the form: give each input a unique `id` and pair it with a `<label for>` so clicking the text focuses the field.',
      starter: '<form>\n  <label>Name</label>\n  <input type="text" name="name">\n  <label>City</label>\n  <input type="text" name="city">\n</form>',
      checks: [
        { pattern: '<label[^>]*for="name"', message: 'Point the first label at for="name".' },
        { pattern: '<input[^>]*id="name"', message: 'Give the first input id="name".' },
        { pattern: '<label[^>]*for="city"', message: 'Point the second label at for="city".' },
        { pattern: '<input[^>]*id="city"', message: 'Give the second input id="city".' },
      ],
      solution: '<form>\n  <label for="name">Name</label>\n  <input type="text" id="name" name="name">\n  <label for="city">City</label>\n  <input type="text" id="city" name="city">\n</form>',
    },
    practice: [
      fillBlank({
        id: 'p-for-matches',
        prompt: 'A label’s `for` value must match the input’s `____` value.',
        blanks: [['id']],
        hints: ['Not "name" — the other identifier.'],
        explanation: 'for="email" pairs with id="email". That link is what makes clicking the label focus the field.',
      }),
      choiceTask({
        id: 'p-placeholder-role',
        prompt: 'What is a placeholder for?',
        options: [
          'A short hint about the expected format',
          'Replacing the label',
          'Styling the input background',
        ],
        answer: 0,
        hints: ['It is a hint, not a question.'],
        explanation: 'Placeholders vanish on typing and are frequently too low-contrast, so labels remain essential.',
      }),
    ],
    quiz: [
      question(
        'Which pairing is correct?',
        ['`<label for="age">` + `<input id="age">`', '`<label for="age">` + `<input name="age"> only`', '`<label id="age">` + `<input for="age">`'],
        0,
        'for always matches an id.',
      ),
      question(
        'What does `name` do on an input?',
        ['Defines the key sent to the server', 'Sets the visible text', 'Links the label'],
        0,
        'name="email" makes the server receive email=…',
      ),
    ],
  }),

  lesson({
    id: 'form-buttons',
    title: 'Buttons and Form Submission',
    duration: 8,
    objectives: [
      'Create submit, reset and regular buttons',
      'Use required and pattern for validation',
      'Understand what happens on submit',
    ],
    sections: [
      para('Buttons finish the job. Inside a form, their `type` decides what they do:'),
      table(
        ['`type`', 'Behaviour'],
        [
          ['`submit`', 'Sends the form (default type!)'],
          ['`reset`', 'Clears every field back to defaults'],
          ['`button`', 'Does nothing until JavaScript handles it'],
        ],
      ),
      codeExample(
        '<form action="/signup" method="post">\n  <label for="email">Email</label>\n  <input type="email" id="email" name="email" required>\n  <label for="code">Invite code</label>\n  <input type="text" id="code" name="code" pattern="[A-Z]{6}" title="Six capital letters">\n  <button type="submit">Create account</button>\n  <button type="reset">Clear</button>\n</form>',
      ),
      list([
        '`required` — the browser blocks submission until the field is filled.',
        '`pattern` — a regular expression the value must match.',
        '`title` — shown as the reason when validation fails.',
        'On submit, the browser sends `name=value` pairs to `action`.',
      ]),
      keyPoint('The `<button>` element defaults to `type="submit"` — a stray button inside a form will silently submit it. Be explicit.'),
      warning('Client-side validation can always be bypassed. The server must check every value again.'),
    ],
    takeaways: [
      '`type="submit"` sends; `type="reset"` clears; `type="button"` waits for JS.',
      '`required` and `pattern` give instant feedback.',
      'Validation on the server is non-negotiable.',
    ],
    task: {
      brief: 'Complete the sign-up form: make the email `required`, add an invite-code field with `pattern="[A-Z]{6}"`, and add both a submit and a reset button.',
      starter: '<form action="/signup" method="post">\n  <label for="email">Email</label>\n  <input type="email" id="email" name="email">\n</form>',
      checks: [
        { pattern: '<input[^>]*name="email"[^>]*required|<input[^>]*required[^>]*name="email"', message: 'Add required to the email input.' },
        { pattern: '<input[^>]*name="code"[^>]*pattern=|<input[^>]*pattern=[^>]*name="code"', message: 'Add a pattern attribute to the invite-code input.' },
        { pattern: '<button[^>]*type="submit"', message: 'Add a submit button.' },
        { pattern: '<button[^>]*type="reset"', message: 'Add a reset button.' },
      ],
      solution: '<form action="/signup" method="post">\n  <label for="email">Email</label>\n  <input type="email" id="email" name="email" required>\n  <label for="code">Invite code</label>\n  <input type="text" id="code" name="code" pattern="[A-Z]{6}" title="Six capital letters">\n  <button type="submit">Create account</button>\n  <button type="reset">Clear</button>\n</form>',
    },
    practice: [
      choiceTask({
        id: 'p-stray-submit',
        prompt: 'What is the default `type` of a `<button>` inside a form?',
        options: ['`submit`', '`button`', '`reset`'],
        answer: 0,
        hints: ['It is the reason stray buttons break forms.'],
        explanation: 'A button with no type submits the form — always set type="button" for custom actions.',
      }),
      fillBlank({
        id: 'p-required',
        prompt: 'The attribute that blocks empty submissions is `_______`.',
        blanks: [['required']],
        hints: ['It reads like an instruction.'],
        explanation: 'required triggers the browser’s built-in "please fill this in" validation.',
      }),
    ],
    quiz: [
      question(
        'Which button clears the form fields?',
        ['`type="reset"`', '`type="clear"`', '`type="submit"`'],
        0,
        'reset returns every control to its default value.',
      ),
      question(
        'Where must validation really happen?',
        ['On the server AND in the browser', 'Only in the browser', 'Only in CSS'],
        0,
        'Anyone can disable JS or edit the request — the server must verify.',
      ),
    ],
  }),

  lesson({
    id: 'header-main-footer',
    title: 'Header, Main, and Footer',
    duration: 8,
    objectives: [
      'Identify the three top-level landmarks',
      'Replace generic <div>s with semantic elements',
      'Structure a whole page',
    ],
    sections: [
      para('Semantic elements describe **role**, not appearance. Every page usually has three top-level landmarks:'),
      codeExample(
        '<body>\n  <header>\n    <h1>CodeCraft</h1>\n    <nav>…</nav>\n  </header>\n  <main>\n    <h2>Welcome</h2>\n    <p>The unique main content of this page.</p>\n  </main>\n  <footer>\n    <p>© 2026 CodeCraft</p>\n  </footer>\n</body>',
      ),
      list([
        '`<header>` — intro content: logo, title, navigation.',
        '`<main>` — the primary content; **exactly one** per page.',
        '`<footer>` — closing info: copyright, contact, small links.',
      ]),
      keyPoint('A `<div>` says "a box". A `<main>` says "this is the point of the page" — to a screen reader user, that is gold.'),
      warning('Only one `<main>` per document, and it must not sit inside `<header>`, `<footer>` or `<nav>`.'),
    ],
    takeaways: [
      '`header` / `main` / `footer` are page landmarks.',
      'Exactly one `<main>` per page.',
      'Semantics beat anonymous `<div>` boxes.',
    ],
    task: {
      brief: 'Restructure this page with the three landmarks: wrap the title block in `<header>`, the article in `<main>`, and the copyright line in `<footer>`.',
      starter: '<div class="top">\n  <h1>My blog</h1>\n</div>\n<div class="content">\n  <h2>Post one</h2>\n  <p>Learning semantic HTML, one element at a time.</p>\n</div>\n<div class="bottom">\n  <p>© 2026 My Blog</p>\n</div>',
      checks: [
        { pattern: '<header.*</header>', flags: 'i', message: 'Wrap the title in <header>…</header>.' },
        { pattern: '<main.*</main>', flags: 'i', message: 'Wrap the article in <main>…</main>.' },
        { pattern: '<footer.*</footer>', flags: 'i', message: 'Wrap the copyright in <footer>…</footer>.' },
        { pattern: '<main>', message: 'There must be exactly one <main> element.' },
      ],
      solution: '<header>\n  <h1>My blog</h1>\n</header>\n<main>\n  <h2>Post one</h2>\n  <p>Learning semantic HTML, one element at a time.</p>\n</main>\n<footer>\n  <p>© 2026 My Blog</p>\n</footer>',
    },
    practice: [
      choiceTask({
        id: 'p-main-count',
        prompt: 'How many `<main>` elements may a page have?',
        options: ['Exactly one', 'One per section', 'Unlimited'],
        answer: 0,
        hints: ['There is only one primary content area.'],
        explanation: 'Assistive technology offers a "jump to main" shortcut — it only works with a single main.',
      }),
      choiceTask({
        id: 'p-landmark-role',
        prompt: 'What do semantic landmarks mainly improve?',
        options: [
          'Navigation for assistive technology and search engines',
          'Colour contrast',
          'File size',
        ],
        answer: 0,
        hints: ['Screen readers offer shortcuts to landmarks.'],
        explanation: 'Landmarks let users jump straight to the region they want instead of tabbing through everything.',
      }),
    ],
    quiz: [
      question(
        'Which element holds a page\'s unique primary content?',
        ['`<main>`', '`<body>`', '`<section>`'],
        0,
        'main is the one region that differs from page to page.',
      ),
      question(
        'Where does a site logo usually live?',
        ['`<header>`', '`<footer>`', '`<main>`'],
        0,
        'The header is the introductory region — logo, title and navigation.',
      ),
    ],
  }),

  lesson({
    id: 'section-article',
    title: 'Section and Article',
    duration: 8,
    objectives: [
      'Choose between <section> and <article>',
      'Group content meaningfully',
      'Give sections headings',
    ],
    sections: [
      para('Two elements divide a page into chunks — but they mean different things:'),
      list([
        '`<article>` — a **self-contained** piece that still makes sense on its own: a blog post, a card, a comment, a news story.',
        '`<section>` — a **thematic grouping** of related content, usually with its own heading.',
      ]),
      codeExample(
        '<main>\n  <article>\n    <h2>Why semantic HTML matters</h2>\n    <p>…full post…</p>\n    <section>\n      <h3>Comments</h3>\n      <p>…</p>\n    </section>\n  </article>\n</main>',
      ),
      keyPoint('Test: could this content be syndicated or bookmarked on its own? If yes → `<article>`. If it is just a labelled part of a bigger whole → `<section>`.'),
      warning('A `<section>` without a heading is usually a `<div>` in disguise. If you cannot write a heading for it, do not use `<section>`.'),
      tip('RSS readers, "reading mode" buttons and search engines all rely on `<article>` to find your actual content.'),
    ],
    takeaways: [
      '`<article>` = self-contained content.',
      '`<section>` = a themed group, normally headed.',
      'Both improve readability for humans and machines.',
    ],
    task: {
      brief: 'Write a blog-style `<article>` with an `<h2>` title and a paragraph, then include a `<section>` inside it for related links with its own `<h3>`.',
      starter: '<main>\n</main>',
      checks: [
        { pattern: '<article.*</article>', flags: 'i', message: 'Add an <article>…</article> inside main.' },
        { pattern: '<h2>[^<]+</h2>', message: 'Give the article an <h2> title.' },
        { pattern: '(?s)<article.*<section.*</section>.*</article>', flags: 'i', message: 'Nest a <section> inside the article.' },
        { pattern: '<h3>[^<]+</h3>', message: 'Give the section its own <h3> heading.' },
      ],
      solution: '<main>\n  <article>\n    <h2>My first semantic page</h2>\n    <p>Semantic elements describe what content means, not how it looks.</p>\n    <section>\n      <h3>Related links</h3>\n      <ul>\n        <li><a href="/learn">Learning paths</a></li>\n      </ul>\n    </section>\n  </article>\n</main>',
    },
    practice: [
      choiceTask({
        id: 'p-article-vs-section',
        prompt: 'A recipe page with ingredients, method and reviews — which parts are `<article>`?',
        options: [
          'The whole recipe (it stands alone)',
          'Only the footer',
          'None — recipes cannot be articles',
        ],
        answer: 0,
        hints: ['Could the recipe be shared on its own?'],
        explanation: 'The recipe is self-contained and syndicatable. The method and reviews would be <section>s inside it.',
      }),
      fillBlank({
        id: 'p-section-heading',
        prompt: 'A `<______>` should normally contain its own heading.',
        blanks: [['section']],
        hints: ['It groups a themed block of content.'],
        explanation: 'The heading is what makes the grouping meaningful to readers and to the document outline.',
      }),
    ],
    quiz: [
      question(
        'Which element is for self-contained content like a blog post?',
        ['`<article>`', '`<aside>`', '`<nav>`'],
        0,
        'An article stands on its own when extracted from the page.',
      ),
      question(
        'When is `<section>` the wrong choice?',
        ['When it has no heading', 'When it contains a list', 'When it is inside <main>'],
        0,
        'An unlabelled grouping is just a generic box — use a div instead.',
      ),
    ],
  }),

  lesson({
    id: 'nav-aside',
    title: 'Navigation and Aside',
    duration: 8,
    objectives: [
      'Wrap menus in <nav>',
      'Use <aside> for related content',
      'Understand landmark roles',
    ],
    sections: [
      para('Two more landmarks complete the standard page:'),
      codeExample(
        '<nav aria-label="Main">\n  <ul>\n    <li><a href="/">Home</a></li>\n    <li><a href="/learn">Learn</a></li>\n    <li><a href="/courses">Courses</a></li>\n  </ul>\n</nav>\n\n<main>\n  <article>…</article>\n  <aside>\n    <h2>Related courses</h2>\n    <ul>\n      <li>CSS Fundamentals</li>\n      <li>JavaScript Fundamentals</li>\n    </ul>\n  </aside>\n</main>',
      ),
      list([
        '`<nav>` — a major block of navigation links.',
        '`<aside>` — supporting content, related but not essential (sidebars, pull quotes, related links).',
        'Not every list of links needs `<nav>` — use it for the primary navigation.',
      ]),
      keyPoint('`<aside>` means "tangential but related". If the page still makes sense without it, `<aside>` is a good fit.'),
      warning('Do not put the *main* content in an `<aside>` — assistive technology treats it as secondary and users may skip it.'),
    ],
    takeaways: [
      '`<nav>` wraps primary navigation.',
      '`<aside>` holds supporting, related content.',
      'Both are landmarks users can jump to.',
    ],
    task: {
      brief: 'Add a primary `<nav>` containing a list of three links, then an `<aside>` after the article with an `<h2>` and a short list of related items.',
      starter: '<header>\n  <h1>DevNotes</h1>\n</header>\n<main>\n  <article>\n    <h2>Today’s post</h2>\n    <p>Semantic tags make pages easier to navigate.</p>\n  </article>\n</main>',
      checks: [
        { pattern: '<nav.*</nav>', flags: 'i', message: 'Add a <nav>…</nav> with links inside.' },
        { pattern: '<nav.*<a', flags: 'i', message: 'Put at least one <a> link inside the nav.' },
        { pattern: '<aside.*</aside>', flags: 'i', message: 'Add an <aside>…</aside> with supporting content.' },
        { pattern: '(?s)<aside.*<h2>.*</aside>', flags: 'i', message: 'Give the aside a heading.' },
      ],
      solution: '<header>\n  <h1>DevNotes</h1>\n  <nav aria-label="Main">\n    <ul>\n      <li><a href="/">Home</a></li>\n      <li><a href="/posts">Posts</a></li>\n      <li><a href="/about">About</a></li>\n    </ul>\n  </nav>\n</header>\n<main>\n  <article>\n    <h2>Today’s post</h2>\n    <p>Semantic tags make pages easier to navigate.</p>\n  </article>\n  <aside>\n    <h2>Related reading</h2>\n    <ul>\n      <li>Why headings matter</li>\n      <li>Forms without frustration</li>\n    </ul>\n  </aside>\n</main>',
    },
    practice: [
      choiceTask({
        id: 'p-aside-content',
        prompt: 'Which content belongs in an `<aside>`?',
        options: [
          'A "Related tutorials" sidebar',
          'The article’s main argument',
          'The page title',
        ],
        answer: 0,
        hints: ['Something helpful but not essential.'],
        explanation: 'Asides support the main content: related links, definitions, ads, secondary notes.',
      }),
      fillBlank({
        id: 'p-nav-tag',
        prompt: 'A block of primary links is wrapped in `<_____>`.',
        blanks: [['nav']],
        hints: ['Short for navigation.'],
        explanation: '<nav> is a landmark, so screen reader users can jump straight to it.',
      }),
    ],
    quiz: [
      question(
        'Which elements are page landmarks?',
        ['`<nav>` and `<aside>`', '`<span>` and `<b>`', '`<dl>` and `<dt>`'],
        0,
        'nav, aside, header, main and footer are all landmark elements.',
      ),
      question(
        'What kind of content suits `<aside>`?',
        ['Secondary content related to the main topic', 'The primary article', 'The footer copyright'],
        0,
        'The page must remain understandable without it.',
      ),
    ],
  }),

  lesson({
    id: 'semantic-best-practices',
    title: 'Semantic HTML Best Practices',
    duration: 9,
    objectives: [
      'Replace divs with the right semantic element',
      'Keep a logical heading order',
      'Audit a page for semantics',
    ],
    sections: [
      para('You now know the vocabulary. This lesson is about using it consistently.'),
      codeExample(
        '<!-- Before: anonymous boxes -->\n<div class="header">…</div>\n<div class="content">…</div>\n\n<!-- After: meaningful landmarks -->\n<header>…</header>\n<main>…</main>',
      ),
      list([
        '**Prefer semantic elements** — `<button>` over `<div onclick>`, `<a>` over `<div role="link"`.',
        '**Keep heading order** — no skipped levels, one `<h1>`.',
        '**Use landmarks** — header, nav, main, aside, footer.',
        '**One `<main>`**, and make sure it contains the page\'s actual purpose.',
        '**Write alt text** for every meaningful image.',
        '`<div>` is not banned — it is for styling hooks that have no meaning of their own.',
      ]),
      keyPoint('Semantic HTML is free accessibility: better navigation, better SEO, better readability — and less CSS to write.'),
      warning('Do not invent roles with ARIA when a native element already exists. `<button>` behaves correctly out of the box; a div pretending to be a button does not.'),
      tip('A good test: view the page with CSS disabled. If the structure still makes sense, your markup is doing its job.'),
    ],
    takeaways: [
      'Native semantic elements beat generic boxes.',
      'Landmarks + correct heading order = navigable pages.',
      'Use `<div>` only where nothing semantic applies.',
    ],
    task: {
      brief: 'Audit this markup: convert the header, content and footer divs into landmarks, keep exactly one `<main>`, and make sure the heading order starts with a single `<h1>`.',
      starter: '<div class="page">\n  <div class="hdr"><div class="title">Audit me</div></div>\n  <div class="body">\n    <div class="h">Section one</div>\n    <p>Semantic markup is easier for everyone to use.</p>\n  </div>\n  <div class="ftr"><p>© 2026</p></div>\n</div>',
      checks: [
        { pattern: '<header.*</header>', flags: 'i', message: 'Use <header> for the top region.' },
        { pattern: '<main.*</main>', flags: 'i', message: 'Use <main> for the content region.' },
        { pattern: '<footer.*</footer>', flags: 'i', message: 'Use <footer> for the bottom region.' },
        { pattern: '<h1>', message: 'The page title should be an <h1>.' },
        { pattern: '<h2>', message: 'The section heading should be an <h2>.' },
      ],
      solution: '<header>\n  <h1>Audit me</h1>\n</header>\n<main>\n  <h2>Section one</h2>\n  <p>Semantic markup is easier for everyone to use.</p>\n</main>\n<footer>\n  <p>© 2026</p>\n</footer>',
    },
    practice: [
      choiceTask({
        id: 'p-button-vs-div',
        prompt: 'Which is the better clickable control?',
        options: ['`<button>`', '`<div onclick="…">`', '`<span>` with a cursor style'],
        answer: 0,
        hints: ['Which one works with a keyboard for free?'],
        explanation: '<button> is focusable, keyboard-operable and announced correctly. A div needs ARIA and JavaScript to catch up.',
      }),
      reorderTask({
        id: 'p-landmark-order',
        prompt: 'Arrange the landmarks in typical page order.',
        fragments: ['<footer>', '<main>', '<header>'],
        answer: ['<header>', '<main>', '<footer>'],
        hints: ['Branding and navigation come first.', 'Copyright comes last.'],
        explanation: 'header → main → footer is the canonical document structure.',
      }),
    ],
    quiz: [
      question(
        'Which is NOT a semantic element?',
        ['`<div>`', '`<nav>`', '`<article>`'],
        0,
        'div carries no meaning — it is a pure container for styles.',
      ),
      question(
        'Why prefer a native `<button>` over a styled `<div>`?',
        ['It works with keyboards and screen readers by default', 'It is smaller in bytes', 'It animates automatically'],
        0,
        'Native elements ship with accessibility built in.',
      ),
    ],
  }),
]
