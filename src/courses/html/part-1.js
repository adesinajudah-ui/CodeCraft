import {
  para, list, codeExample, tip, keyPoint, warning, note, table,
  question, fillBlank, choiceTask, reorderTask, codeTask, lesson,
} from '../content-helpers.js'

// Modules 1–3 — Introduction to HTML, Document Structure, Working with Text

export const part1Lessons = [
  lesson({
    id: 'what-is-html',
    title: 'What Is HTML?',
    duration: 8,
    objectives: [
      'Explain what HTML is and what it is used for',
      'Recognise an HTML element with a tag and content',
      'Read a small snippet of markup',
    ],
    sections: [
      para('HTML stands for **HyperText Markup Language**. It is the standard language used to structure content on the web — headings, paragraphs, links, images and everything else you see on a page.'),
      para('HTML does not describe *how* a page looks. It describes *what the content is*. Browsers read the HTML and turn it into the page you see.'),
      codeExample('<h1>My First Website</h1>\n<p>I am learning HTML with CodeCraft.</p>', 'Two HTML elements: a top-level heading and a paragraph.'),
      para('`<h1>` is the largest heading element. Browsers show everything between `<h1>` and `</h1>` as one big heading. `<p>` creates a paragraph of text.'),
      keyPoint('HTML elements are written inside angle brackets. An element has an opening tag, the content, and a closing tag: `<tag>content</tag>`.'),
      list([
        '`<h1>` — the main heading of the page',
        '`<p>` — a paragraph of text',
        '`</…>` — the closing slash marks the end of an element',
      ]),
      tip('You do not need to install anything to write HTML. A plain text file saved with the `.html` extension opens in any browser.'),
    ],
    takeaways: [
      'HTML structures content; it does not style it.',
      'An element = opening tag + content + closing tag.',
      'Headings (`<h1>`) and paragraphs (`<p>`) are the building blocks of every page.',
    ],
    task: {
      brief: 'Make this page yours: change the heading to your own name, and rewrite the paragraph so it describes what your website will be about. Then press **Run** to see it appear.',
      starter: '<h1>My First Website</h1>\n<p>I am learning HTML with CodeCraft.</p>',
      checks: [
        { pattern: '<h1>[^<]{3,}</h1>', message: 'Put a heading inside <h1>…</h1> — at least a few characters.' },
        { pattern: '<p>[^<]{15,}</p>', message: 'Write a sentence (15+ characters) inside <p>…</p>.' },
        { pattern: 'My First Website', not: true, message: 'Replace the placeholder heading with your own.' },
      ],
      solution: '<h1>Alex Morgan</h1>\n<p>This is my personal website where I will share the things I am building while I learn to code.</p>',
    },
    practice: [
      fillBlank({
        id: 'p-html-acronym',
        prompt: 'HTML stands for ______ Markup Language.',
        blanks: [['hypertext', 'hyper text']],
        hints: ['It starts with "Hyper".', 'One word: H-Y-P-E-R-T-E-X-T.'],
        explanation: 'HyperText — text that can link to other text — is what made the web navigable in the first place.',
      }),
      choiceTask({
        id: 'p-html-role',
        prompt: 'What is HTML mainly responsible for?',
        options: [
          'Structuring the content of a web page',
          'Choosing the colours and fonts of a page',
          'Storing data in a database',
        ],
        answer: 0,
        hints: ['Think about "what is on the page", not "how it looks".'],
        explanation: 'HTML describes structure and meaning. Styling is done with CSS, and behaviour with JavaScript.',
      }),
    ],
    quiz: [
      question(
        'Which element creates the main heading of a page?',
        ['`<h1>`', '`<head>`', '`<p>`'],
        0,
        '<h1> is the highest-level heading. <head> holds page metadata, and <p> creates a paragraph.',
      ),
      question(
        'How do you correctly close an HTML element?',
        ['`</tag>`', '`<tag/>`', '`<end tag>`'],
        0,
        'A closing tag is the same name preceded by a forward slash: </p>, </h1>, </a>.',
      ),
    ],
  }),

  lesson({
    id: 'how-websites-work',
    title: 'How Websites Work',
    duration: 7,
    objectives: [
      'Describe what happens when you open a website',
      'Understand the roles of the browser, server and HTML',
    ],
    sections: [
      para('When you type an address into your browser, a short conversation happens:'),
      list([
        'Your browser asks a **server** for the page.',
        'The server replies with **HTML** (plus CSS, images and scripts).',
        'The browser **parses** the HTML and builds a tree of elements called the **DOM**.',
        'The browser paints that tree on screen.',
      ], true),
      para('Everything you can see, click or read on a page started life as HTML text. If the HTML says `<button>Buy now</button>`, the browser knows there is a button there.'),
      codeExample('<h1>Welcome</h1>\n<p>This text travelled from a server to your browser as plain HTML.</p>', 'The browser rebuilds this structure every time you load the page.'),
      keyPoint('HTML is the skeleton of every website. CSS dresses it up, and JavaScript makes it move.'),
      tip('Right-click any page and choose "View page source" to see the exact HTML the server sent back.'),
    ],
    takeaways: [
      'Browser → server request, server → HTML response.',
      'Browsers convert HTML into the DOM (Document Object Model).',
      'All web pages are built from HTML at their core.',
    ],
    task: {
      brief: 'Run the code to watch the browser build the page, then add **two** paragraphs of your own describing what you can see.',
      starter: '<h1>Welcome to my website</h1>\n<p>The browser turns this code into the page you are reading now.</p>',
      checks: [
        { pattern: '<h1>', message: 'Keep a heading with <h1>…</h1>.' },
        { pattern: '(?s)<p>.*</p>.*<p>', flags: 'i', message: 'Add a second <p>…</p> paragraph below the first one.' },
      ],
      solution: '<h1>Welcome to my website</h1>\n<p>The browser turns this code into the page you are reading now.</p>\n<p>I can see a large heading at the top of the page.</p>\n<p>And below it, two paragraphs of ordinary text.</p>',
    },
    practice: [
      choiceTask({
        id: 'p-browser-receives',
        prompt: 'What does the browser receive from the server first?',
        snippet: 'GET /home → 200 OK',
        options: ['HTML text', 'A finished picture of the page', 'A PDF of the website'],
        answer: 0,
        hints: ['The response is text the browser has to interpret.'],
        explanation: 'The server sends HTML (and other assets). The browser renders it locally — pages are never "sent" as images.',
      }),
    ],
    quiz: [
      question(
        'What does the browser build from HTML?',
        ['The DOM', 'A database', 'A CSS file'],
        0,
        'The Document Object Model (DOM) is the tree the browser creates from your HTML.',
      ),
      question(
        'Which language gives a web page its structure?',
        ['HTML', 'SQL', 'Python'],
        0,
        'HTML structures content. CSS styles it and JavaScript adds behaviour.',
      ),
    ],
  }),

  lesson({
    id: 'first-html-page',
    title: 'Your First HTML Page',
    duration: 10,
    objectives: [
      'Write a complete, valid HTML document',
      'Explain the purpose of <head> and <body>',
      'Change the title and content of a page',
    ],
    sections: [
      para('Real web pages follow a standard skeleton. Every document starts with a DOCTYPE, then one `<html>` element that contains a `<head>` and a `<body>`.'),
      codeExample(
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>This is my first HTML page.</p>\n</body>\n</html>',
        'The smallest complete HTML document.',
      ),
      list([
        '`<!DOCTYPE html>` tells the browser this is modern HTML.',
        '`<head>` holds information *about* the page (title, character set, styles).',
        '`<body>` holds everything the visitor can actually see.',
      ]),
      keyPoint('One page = one `<html>` = one `<head>` + one `<body>`. Learn this shape once and every future page becomes easy.'),
      warning('The `<title>` is not the same as your `<h1>`. The title appears on the browser tab; the heading appears in the page.'),
    ],
    takeaways: [
      'A complete page starts with `<!DOCTYPE html>`.',
      '`<head>` is for metadata, `<body>` is for visible content.',
      'The `<title>` shows in the browser tab.',
    ],
    task: {
      brief: 'Personalise your first page: give it a title of your own, change the heading to your name, and add a paragraph about yourself. Press **Run** and check the preview.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>This is my first HTML page.</p>\n</body>\n</html>',
      checks: [
        { pattern: '<!DOCTYPE html>', message: 'Keep the <!DOCTYPE html> declaration on the first line.' },
        { pattern: '<title>[^<]{5,}</title>', message: 'Write a longer, personal <title>…</title>.' },
        { pattern: '<title>My First Page</title>', not: true, message: 'Replace the placeholder title with your own.' },
        { pattern: '<h1>[^<]{3,}</h1>', message: 'Add your name inside <h1>…</h1>.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Jamie Rivera</title>\n</head>\n<body>\n  <h1>Jamie Rivera</h1>\n  <p>I am learning to build websites with CodeCraft, one lesson at a time.</p>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-head-vs-body',
        prompt: 'Where does visible page content belong?',
        options: ['Inside `<body>`', 'Inside `<head>`', 'Inside `<title>`'],
        answer: 0,
        hints: ['One of these is literally named after the visible part of a page.'],
        explanation: 'The <body> holds headings, paragraphs, images and everything a visitor sees. The <head> holds metadata.',
      }),
      fillBlank({
        id: 'p-first-line',
        prompt: 'Every HTML5 document begins with `<!______ html>`.',
        blanks: [['doctype', 'doc type', 'DOCTYPE']],
        hints: ['It is a declaration, not a tag — and it has no closing version.'],
        explanation: 'Without the DOCTYPE the browser may fall back to old, "quirks" rendering rules.',
      }),
    ],
    quiz: [
      question(
        'What belongs inside `<head>`?',
        ['The page title and metadata', 'Paragraphs and images', 'The main heading'],
        0,
        'The <head> is invisible metadata: title, charset, viewport, links to stylesheets.',
      ),
      question(
        'Which line must appear at the very top of an HTML5 document?',
        ['`<!DOCTYPE html>`', '`<html>`', '`<body>`'],
        0,
        'The DOCTYPE declaration must be the very first thing in the file.',
      ),
    ],
  }),

  lesson({
    id: 'html-elements',
    title: 'Understanding HTML Elements',
    duration: 9,
    objectives: [
      'Break an element into opening tag, content and closing tag',
      'Recognise void (self-closing) elements',
      'Add an attribute to an element',
    ],
    sections: [
      para('An **element** is the whole package: opening tag, content, closing tag.'),
      codeExample('<p>This sentence is the content.</p>\n↑opening tag   ↑content   ↑closing tag', 'Anatomy of an HTML element.'),
      para('Elements can carry extra information called **attributes**. An attribute always lives in the opening tag and comes as a name/value pair:'),
      codeExample('<p class="intro">Welcome aboard</p>', '`class` is the attribute name; `"intro"` is its value.'),
      para('Some elements have no content at all — these are **void elements**. They never close:'),
      codeExample('<br>\n<hr>\n<img src="photo.jpg" alt="">'),
      keyPoint('Attributes tell the browser *which* element you mean and *how* it should behave — `href` for links, `src` for images, `alt` for alternative text.'),
      warning('Every element you open should be closed, in the right order: `<strong><em>hi</em></strong>`, never `<strong><em>hi</strong></em>`.'),
    ],
    takeaways: [
      'Element = opening tag + content + closing tag.',
      'Attributes live in the opening tag as `name="value"`.',
      'Void elements (`<br>`, `<img>`) are never closed.',
    ],
    task: {
      brief: 'Give the paragraph a `class` attribute called **intro**, then wrap the word HTML in a `<strong>` element so it reads as emphasis.',
      starter: '<h1>Why HTML matters</h1>\n<p>HTML is the foundation of every website you visit.</p>',
      checks: [
        { pattern: '<p[^>]*class="intro"', message: 'Add class="intro" to the opening <p> tag.' },
        { pattern: '<strong>[^<]+</strong>', message: 'Wrap a word in <strong>…</strong>.' },
      ],
      solution: '<h1>Why HTML matters</h1>\n<p class="intro">Strong knowledge of <strong>HTML</strong> is the foundation of every website you visit.</p>',
    },
    practice: [
      fillBlank({
        id: 'p-closing-tag',
        prompt: 'The closing tag for `<em>text</em>` is written as `</____>`.',
        blanks: [['em']],
        hints: ['A closing tag is a slash followed by the element name.'],
        explanation: '</em> closes the element. Forgetting it makes the browser guess where the element ends.',
      }),
      choiceTask({
        id: 'p-void-element',
        prompt: 'Which of these is a void element that never gets a closing tag?',
        options: ['`<img>`', '`<p>`', '`<h2>`'],
        answer: 0,
        hints: ['It embeds something rather than wrapping text.'],
        explanation: '<img> has no content to wrap, so it never needs </img>. Paragraphs and headings always close.',
      }),
    ],
    quiz: [
      question(
        'In `<a href="/about">About</a>`, what is the attribute?',
        ['`href="/about"`', '`/about`', '`About`'],
        0,
        'href is the attribute name and "/about" is its value.',
      ),
      question(
        'Which is written correctly?',
        ['`<img src="cat.jpg" alt="Cat">`', '`<img src="cat.jpg" alt="Cat"></img>`', '`<img src="cat.jpg">Cat</img>`'],
        0,
        'Images are void elements: they open and never close.',
      ),
    ],
  }),

  lesson({
    id: 'doctype',
    title: 'The DOCTYPE Declaration',
    duration: 6,
    objectives: [
      'Write the DOCTYPE declaration correctly',
      'Explain why browsers need it',
    ],
    sections: [
      para('The very first line of an HTML document is a special declaration called the DOCTYPE:'),
      codeExample('<!DOCTYPE html>'),
      para('It is not an element and it never closes — the `!` marks it as a declaration. Its one job is to switch the browser into **standards mode** so pages render the modern, predictable way.'),
      warning('Leave the DOCTYPE out and old browsers may render your page in "quirks mode": broken layouts, strange spacing, unpredictable results.'),
      tip('Modern HTML (HTML5) only needs the short `<!DOCTYPE html>`. Older versions needed long lists of identifiers you can safely forget.'),
    ],
    takeaways: [
      '`<!DOCTYPE html>` goes on line 1, always.',
      'It is a declaration, not an element — no closing tag.',
      'It prevents quirks mode rendering.',
    ],
    task: {
      brief: 'This document is missing its declaration. Add `<!DOCTYPE html>` as the very first line, then run the code.',
      starter: '<html lang="en">\n<head>\n  <title>No declaration</title>\n</head>\n<body>\n  <h1>Standards mode, please</h1>\n</body>\n</html>',
      checks: [
        { pattern: '^\s*<!DOCTYPE html>', flags: 'im', message: 'Add <!DOCTYPE html> as the first line of the file.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>No declaration</title>\n</head>\n<body>\n  <h1>Standards mode, please</h1>\n</body>\n</html>',
    },
    practice: [
      fillBlank({
        id: 'p-doctype-name',
        prompt: 'The declaration is written `<!_______ html>`.',
        blanks: [['doctype', 'doc type']],
        hints: ['It is short for "document type".'],
        explanation: 'The DOCTYPE tells the browser which version of HTML to expect. For HTML5 there is only one.',
      }),
    ],
    quiz: [
      question(
        'Where does the DOCTYPE go?',
        ['Before `<html>`, on line 1', 'After `<head>`', 'Inside `<body>`'],
        0,
        'It must be the first thing in the file, before any element.',
      ),
      question(
        'What happens without a DOCTYPE?',
        ['The browser may render in quirks mode', 'The page cannot load', 'The CSS stops working'],
        0,
        'Browsers guess the layout rules — small differences appear across browsers.',
      ),
    ],
  }),

  lesson({
    id: 'html-element',
    title: 'The html Element',
    duration: 6,
    objectives: [
      'Identify the root element of a document',
      'Use the lang attribute correctly',
    ],
    sections: [
      para('Everything in your document lives inside **one** `<html>` element. It is called the root of the document tree.'),
      codeExample('<html lang="en">\n  <head>…</head>\n  <body>…</body>\n</html>'),
      para('The `lang` attribute declares the language of the page. It sounds small, but it matters: screen readers pronounce words differently, and search engines use it to decide who should see your page.'),
      codeExample('<html lang="en">   English\n<html lang="es">   Spanish\n<html lang="ar">   Arabic'),
      keyPoint('There must be exactly one `<html>` element, and it must contain the `<head>` and the `<body>` — nothing outside it.'),
      tip('Setting `lang` is one of the easiest accessibility wins you will ever get. Always include it.'),
    ],
    takeaways: [
      '`<html>` is the root element and wraps the entire document.',
      '`lang` declares the page language for tools and assistive technology.',
      'The `<head>` and `<body>` are its only two children.',
    ],
    task: {
      brief: 'Set the page language to English by adding `lang="en"` to the `<html>` tag, then add a second paragraph inside the body.',
      starter: '<html>\n<head>\n  <title>Root element</title>\n</head>\n<body>\n  <h1>Hello from the root</h1>\n</body>\n</html>',
      checks: [
        { pattern: '<html[^>]*lang="en"', message: 'Add lang="en" inside the opening <html> tag.' },
        { pattern: '(?s)<body[^>]*>.*<p>.*</p>', flags: 'i', message: 'Add a <p>…</p> inside the <body>.' },
      ],
      solution: '<html lang="en">\n<head>\n  <title>Root element</title>\n</head>\n<body>\n  <h1>Hello from the root</h1>\n  <p>Everything on this page lives inside the html element.</p>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-root-element',
        prompt: 'Which element is the root of every HTML document?',
        options: ['`<html>`', '`<body>`', '`<root>`'],
        answer: 0,
        hints: ['Its name is the name of the language itself.'],
        explanation: '<html> wraps everything. There is no <root> element in HTML.',
      }),
    ],
    quiz: [
      question(
        'How many `<html>` elements should a document have?',
        ['One', 'Two — one for head, one for body', 'As many as you like'],
        0,
        'A single root element contains both the head and the body.',
      ),
      question(
        'What does `lang="en"` describe?',
        ['The language of the page content', 'The encoding of the file', 'The layout direction of the CSS'],
        0,
        'en = English. It helps screen readers and search engines.',
      ),
    ],
  }),

  lesson({
    id: 'head-body',
    title: 'The head and body Elements',
    duration: 8,
    objectives: [
      'Split content between head and body correctly',
      'Recognise common metadata elements',
    ],
    sections: [
      para('The `<html>` element has two children, and they have very different jobs:'),
      list([
        '**`<head>`** — invisible setup: character set, title, viewport, stylesheets, scripts.',
        '**`<body>`** — everything the visitor can see and interact with.',
      ]),
      codeExample(
        '<head>\n  <meta charset="UTF-8">\n  <title>CodeCraft</title>\n</head>\n<body>\n  <header>\n    <h1>CodeCraft</h1>\n  </header>\n  <p>Now you can see me.</p>\n</body>',
        'Metadata above, visible content below.',
      ),
      keyPoint('If a human can see it on the page, it belongs in `<body>`. If only the browser or a search engine reads it, it belongs in `<head>`.'),
      warning('Putting headings or paragraphs inside `<head>` is a classic beginner bug: the browser moves them into the body anyway, and your layout breaks in surprising ways.'),
    ],
    takeaways: [
      '`<head>` = metadata about the page.',
      '`<body>` = visible, interactive content.',
      'They are siblings, both inside `<html>`.',
    ],
    task: {
      brief: 'This page has visible content in the wrong place. Move the `<h1>` and `<p>` into the `<body>` so the head only holds metadata.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Moving day</title>\n  <h1>I should be visible</h1>\n  <p>Me too — please move me into the body.</p>\n</head>\n<body>\n</body>\n</html>',
      checks: [
        { pattern: '(?s)<body[^>]*>.*<h1>.*</body>', flags: 'i', message: 'Put the <h1> inside the <body>.' },
        { pattern: '(?s)<body[^>]*>.*<p>.*</body>', flags: 'i', message: 'Put the <p> inside the <body> too.' },
        { pattern: '(?s)<h1>.*</head>', not: true, message: 'Remove the <h1> from the <head>.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Moving day</title>\n</head>\n<body>\n  <h1>I should be visible</h1>\n  <p>Me too — please move me into the body.</p>\n</body>\n</html>',
    },
    practice: [
      choiceTask({
        id: 'p-head-members',
        prompt: 'Which of these belongs in the `<head>`?',
        options: ['`<meta charset="UTF-8">`', '`<h1>`', '`<img>`'],
        answer: 0,
        hints: ['Something invisible to the visitor.'],
        explanation: 'Metadata such as <meta>, <title> and links to CSS lives in the head. Headings and images are visible, so they go in the body.',
      }),
      fillBlank({
        id: 'p-body-visibility',
        prompt: 'Everything a visitor can see lives inside the `<______>` element.',
        blanks: [['body']],
        hints: ['Think of the page as a stage.'],
        explanation: 'The body is the visible part of the document; the head is the paperwork.',
      }),
    ],
    quiz: [
      question(
        'Where should `<title>` go?',
        ['In the `<head>`', 'In the `<body>`', 'Before `<!DOCTYPE>`'],
        0,
        'The title is metadata shown on the browser tab, so it belongs in the head.',
      ),
      question(
        'Where does an `<img>` element belong?',
        ['In the `<body>`', 'In the `<head>`', 'Directly inside `<html>`'],
        0,
        'Images are visible content, so they live in the body.',
      ),
    ],
  }),

  lesson({
    id: 'titles-metadata',
    title: 'Titles and Metadata',
    duration: 8,
    objectives: [
      'Write a useful <title>',
      'Add charset and viewport meta tags',
      'Explain why metadata matters',
    ],
    sections: [
      para('Metadata is information *about* your page. It sits in the `<head>` and never shows in the page body — but it controls how the page behaves everywhere else.'),
      codeExample(
        '<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Jamie Rivera — Developer</title>\n</head>',
        'The three metadata tags almost every page needs.',
      ),
      list([
        '**`charset`** — tells the browser how to decode the text. UTF-8 covers almost every character on Earth.',
        '**`viewport`** — makes the page respect the device width, so it looks right on phones.',
        '**`title`** — the browser tab, the bookmark label, and the headline search engines show.',
      ]),
      keyPoint('A good title reads like a headline: what is this page, and who is it for? Avoid "Untitled Document" or "Page".'),
      warning('Forget the viewport meta tag and your mobile page renders zoomed-out at 980px — text becomes tiny and users have to pinch to zoom.'),
    ],
    takeaways: [
      '`charset="UTF-8"` prevents broken characters.',
      'The `viewport` tag is what makes a page mobile-friendly.',
      'Titles matter for tabs, bookmarks and search results.',
    ],
    task: {
      brief: 'Complete the `<head>`: add the charset and viewport meta tags, and give the page a descriptive title.',
      starter: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>Document</title>\n</head>\n<body>\n  <h1>Metadata matters</h1>\n</body>\n</html>',
      checks: [
        { pattern: '<meta[^>]*charset="UTF-8"', message: 'Add <meta charset="UTF-8"> inside the head.' },
        { pattern: '<meta[^>]*name="viewport"', message: 'Add the viewport meta tag.' },
        { pattern: '<title>Document</title>', not: true, message: 'Replace the placeholder title with a descriptive one.' },
      ],
      solution: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Metadata matters — CodeCraft</title>\n</head>\n<body>\n  <h1>Metadata matters</h1>\n</body>\n</html>',
    },
    practice: [
      fillBlank({
        id: 'p-charset',
        prompt: 'The tag `<meta ______="UTF-8">` sets the character encoding.',
        blanks: [['charset']],
        hints: ['It is short for "character set".'],
        explanation: 'Without it, accents, emoji and non-Latin scripts can turn into garbled characters.',
      }),
      choiceTask({
        id: 'p-viewport',
        prompt: 'Why is the viewport meta tag important?',
        options: [
          'It makes the layout fit mobile screens',
          'It loads images faster',
          'It adds a dark mode',
        ],
        answer: 0,
        hints: ['Think about phones.'],
        explanation: 'It tells mobile browsers to use the device width instead of a fixed 980px desktop layout.',
      }),
    ],
    quiz: [
      question(
        'Which tag sets the browser tab text?',
        ['`<title>`', '`<h1>`', '`<meta name="tab">`'],
        0,
        'The <title> in the head becomes the tab label and search snippet.',
      ),
      question(
        'Which encoding should almost every page use?',
        ['UTF-8', 'ASCII-only', 'Base64'],
        0,
        'UTF-8 supports virtually every language and symbol, including emoji.',
      ),
    ],
  }),

  lesson({
    id: 'headings',
    title: 'Headings',
    duration: 7,
    objectives: [
      'Use <h1>–<h6> in the right order',
      'Explain why heading hierarchy matters',
    ],
    sections: [
      para('HTML gives you six heading levels, from `<h1>` (biggest) to `<h6>` (smallest):'),
      codeExample('<h1>Main heading</h1>\n<h2>Subheading</h2>\n<h3>Smaller section</h3>'),
      para('The numbers describe **structure**, not font size. `<h2>` means "a section of `<h1>`", and browsers only happen to render them smaller.'),
      list([
        'Use **one `<h1>`** per page — the page\'s main topic.',
        'Do not skip levels: `<h1>` → `<h2>` → `<h3>`, never `<h1>` → `<h4>`.',
        'Never pick a heading because of its size — use CSS for that.',
      ]),
      keyPoint('Screen readers and search engines navigate by headings. A clean hierarchy is how both understand your page.'),
      tip('If you only remember one rule: one `<h1>`, then nest the rest logically.'),
    ],
    takeaways: [
      '`<h1>`–`<h6>` describe document structure.',
      'One `<h1>` per page, no skipped levels.',
      'Headings are for meaning; CSS controls size.',
    ],
    task: {
      brief: 'Build a small article outline: one `<h1>` for the article title, an `<h2>` for a section, and an `<h3>` under it.',
      starter: '<h1>My guide to HTML</h1>',
      checks: [
        { pattern: '<h1>', message: 'Keep an <h1> for the article title.' },
        { pattern: '<h2>[^<]+</h2>', message: 'Add an <h2> section heading.' },
        { pattern: '<h3>[^<]+</h3>', message: 'Add an <h3> beneath it.' },
        { pattern: '(?s)<h1>.*<h2>.*<h3>', flags: 'i', message: 'Order them h1 → h2 → h3 in the document.' },
      ],
      solution: '<h1>My guide to HTML</h1>\n<h2>Why structure matters</h2>\n<p>Headings split a page into clear sections.</p>\n<h3>Tip for beginners</h3>\n<p>Start with one h1 and work your way down.</p>',
    },
    practice: [
      reorderTask({
        id: 'p-heading-order',
        prompt: 'Tap the headings in the correct document order (biggest level first).',
        fragments: ['<h3>Detail</h3>', '<h1>Title</h1>', '<h2>Section</h2>'],
        answer: ['<h1>Title</h1>', '<h2>Section</h2>', '<h3>Detail</h3>'],
        hints: ['The page title comes first.', 'The smallest level comes last.'],
        explanation: 'Correct order: <h1> → <h2> → <h3>. Levels should never skip downward.',
      }),
      choiceTask({
        id: 'p-heading-count',
        prompt: 'How many `<h1>` elements should a page normally have?',
        options: ['One', 'One per paragraph', 'As many as possible'],
        answer: 0,
        hints: ['The page has one main topic.'],
        explanation: 'A single <h1> states the page topic. Use <h2> and below for everything else.',
      }),
    ],
    quiz: [
      question(
        'What do heading numbers describe?',
        ['Structural level', 'Font size in pixels', 'Text colour'],
        0,
        'They describe hierarchy in the document outline, not visual size.',
      ),
      question(
        'Which sequence is correct?',
        ['`<h1>` `<h2>` `<h3>`', '`<h1>` `<h4>` `<h2>`', '`<h3>` `<h1>` `<h2>`'],
        0,
        'Levels should descend one step at a time without skipping.',
      ),
    ],
  }),

  lesson({
    id: 'paragraphs',
    title: 'Paragraphs',
    duration: 6,
    objectives: [
      'Write paragraphs with <p>',
      'Understand how whitespace is collapsed',
    ],
    sections: [
      para('A paragraph of text goes inside `<p>`…`</p>`. Browsers add space above and below each paragraph automatically.'),
      codeExample('<p>First idea.</p>\n<p>Second idea — a new paragraph starts on a new line.</p>'),
      para('Browsers **collapse whitespace**: extra spaces, tabs and line breaks in your source all become a single space in the output. That is why this code renders as one line:'),
      codeExample('<!-- Renders as one continuous line -->\n<p>These   are\nall     one paragraph.</p>'),
      warning('Never use empty paragraphs (`<p></p>`) to create space — that is CSS\'s job. And never put a `<div>` inside a `<p>`: block elements cannot nest inside text elements.'),
      tip('Press Enter in your source as often as you like for readability — it will not affect the rendered page.'),
    ],
    takeaways: [
      'One `<p>` per paragraph of text.',
      'Whitespace collapses to a single space in the browser.',
      'Spacing and layout belong to CSS.',
    ],
    task: {
      brief: 'Write a short introduction with **three** paragraphs: who you are, what you are learning, and what you want to build.',
      starter: '<h1>About me</h1>\n<p>Start writing here…</p>',
      checks: [
        { pattern: '(?s)<p>.*</p>.*<p>.*</p>.*<p>', message: 'Write three separate <p> elements.' },
        { pattern: 'Start writing here', not: true, message: 'Replace the placeholder text.' },
      ],
      solution: '<h1>About me</h1>\n<p>Hi, I am Priya and I am based in Manchester.</p>\n<p>I am learning HTML with CodeCraft because I want to build my own website.</p>\n<p>My first project will be a portfolio for the photography I do at weekends.</p>',
    },
    practice: [
      choiceTask({
        id: 'p-whitespace',
        prompt: 'What happens to multiple spaces and line breaks inside HTML source?',
        options: [
          'They collapse into a single space',
          'They are preserved exactly',
          'They delete the text',
        ],
        answer: 0,
        hints: ['Try it in the editor — add ten spaces between two words.'],
        explanation: 'HTML collapses whitespace. Use <br> for a deliberate line break, or CSS for spacing.',
      }),
    ],
    quiz: [
      question(
        'Which element holds a block of text?',
        ['`<p>`', '`<span>`', '`<text>`'],
        0,
        '<p> is the paragraph element. <span> is for inline fragments of text.',
      ),
      question(
        'Do blank lines in your HTML source create blank lines on the page?',
        ['No — whitespace collapses', 'Yes — always', 'Only inside <body>'],
        0,
        'Extra whitespace (spaces, tabs, newlines) is squeezed into one space by the browser.',
      ),
    ],
  }),

  lesson({
    id: 'breaks-rules',
    title: 'Line Breaks and Horizontal Rules',
    duration: 6,
    objectives: [
      'Insert a line break with <br>',
      'Separate content with <hr>',
      'Know when NOT to use them',
    ],
    sections: [
      para('Sometimes you genuinely want a line break inside a paragraph — an address, a poem, a lyric:'),
      codeExample('CodeCraft HQ<br>\n12 Developer Street<br>\nLearn City LC1 2AB'),
      para('The `<hr>` element creates a thematic break — a horizontal rule that signals a change of topic:'),
      codeExample('<p>Part one of the story.</p>\n<hr>\n<p>Part two of the story.</p>'),
      list([
        '`<br>` is a void element: no closing tag.',
        '`<hr>` is also void and is *semantic* — it means "new section", not "draw a line".',
        'Neither should be used just to add gaps between blocks — that is CSS spacing.',
      ]),
      keyPoint('Use `<br>` for real line breaks inside text and `<hr>` for genuine topic changes. Everything else is styling.'),
      warning('A page stacked with `<br><br><br>` is a classic beginner anti-pattern. Vertical rhythm comes from CSS margins.'),
    ],
    takeaways: [
      '`<br>` forces a new line; `<hr>` marks a thematic break.',
      'Both are void elements.',
      'Do not use them as layout tools.',
    ],
    task: {
      brief: 'Format the address with a line break after each line, then add an `<hr>` between the contact details and the closing note.',
      starter: '<p>CodeCraft Academy 12 Developer Street Learn City LC1 2AB</p>\n<p>Open Monday to Friday.</p>',
      checks: [
        { pattern: '<br\s*/?>', message: 'Add <br> between the address lines.' },
        { pattern: '<hr\s*/?>', message: 'Add an <hr> between the two blocks.' },
      ],
      solution: '<p>CodeCraft Academy<br>\n12 Developer Street<br>\nLearn City LC1 2AB</p>\n<hr>\n<p>Open Monday to Friday.</p>',
    },
    practice: [
      fillBlank({
        id: 'p-br-tag',
        prompt: 'The element that starts a new line inside a paragraph is `<____>`.',
        blanks: [['br']],
        hints: ['Short for "break".'],
        explanation: '<br> is void — it never gets a closing tag.',
      }),
      choiceTask({
        id: 'p-hr-meaning',
        prompt: 'What does `<hr>` really mean?',
        options: [
          'A thematic break between sections',
          'A blank line of space',
          'A horizontal scrollbar',
        ],
        answer: 0,
        hints: ['It is semantic, not decorative.'],
        explanation: '<hr> signals a change of topic. Browsers usually style it as a line, but that is just a default.',
      }),
    ],
    quiz: [
      question(
        'Is `<br>` a void element?',
        ['Yes — it never closes', 'No — it needs `</br>`', 'Only inside tables'],
        0,
        'Line breaks have no content to wrap, so they never close.',
      ),
      question(
        'What is the better way to add space between two paragraphs?',
        ['CSS margins', 'Several `<br>` tags', 'Empty `<p></p>` tags'],
        0,
        'Spacing and layout should always come from CSS.',
      ),
    ],
  }),

  lesson({
    id: 'text-formatting',
    title: 'Text Formatting',
    duration: 8,
    objectives: [
      'Mark importance with <strong> and <em>',
      'Use <mark>, <sub> and <sup> appropriately',
      'Distinguish meaning from appearance',
    ],
    sections: [
      para('HTML has elements for *meaning*. Browsers decide how to display them — and screen readers announce the difference.'),
      codeExample(
        '<p><strong>Warning:</strong> always close your tags.</p>\n<p>Water boils at 100<sup>o</sup>C at sea level.</p>\n<p>He was <em>not</em> expecting that.</p>\n<p>Search for <mark>HTML basics</mark> to begin.</p>',
      ),
      table(
        ['Element', 'Meaning', 'Looks like'],
        [
          ['`<strong>`', 'Strong importance', 'Bold'],
          ['`<em>`', 'Emphasis', 'Italic'],
          ['`<mark>`', 'Relevant highlight', 'Yellow background'],
          ['`<sub>` / `<sup>`', 'Sub / superscript', 'H₂O · x²'],
          ['`<del>` / `<ins>`', 'Removed / added text', 'Strikethrough / underline'],
        ],
      ),
      keyPoint('`<b>` and `<i>` only change appearance. `<strong>` and `<em>` carry meaning — assistive technology can announce them.'),
      tip('If you are choosing between `<b>` and `<strong>`, choose `<strong>`. Same for `<i>` vs `<em>`.'),
    ],
    takeaways: [
      'Use `<strong>` for importance and `<em>` for emphasis.',
      '`<mark>` highlights relevant text.',
      'Semantic tags beat visual tags.',
    ],
    task: {
      brief: 'Polish the notice: make "Caution" strong, highlight the word "today" with `<mark>`, and put the chemical formula for water using `<sub>`.',
      starter: '<p>Caution: the lab closes today. Water is H2O.</p>',
      checks: [
        { pattern: '<strong>[^<]+</strong>', message: 'Wrap "Caution" in <strong>…</strong>.' },
        { pattern: '<mark>[^<]+</mark>', message: 'Wrap "today" in <mark>…</mark>.' },
        { pattern: 'H<sub>2</sub>O', message: 'Write the formula as H<sub>2</sub>O.' },
      ],
      solution: '<p><strong>Caution:</strong> the lab closes <mark>today</mark>. Water is H<sub>2</sub>O.</p>',
    },
    practice: [
      choiceTask({
        id: 'p-strong-vs-b',
        prompt: 'Which pair is the better, more meaningful choice?',
        options: ['`<strong>` and `<em>`', '`<b>` and `<i>`', '`<u>` and `<s>`'],
        answer: 0,
        hints: ['Which pair carries meaning for screen readers?'],
        explanation: '<strong> and <em> communicate importance and emphasis to everyone, not just sighted readers.',
      }),
      fillBlank({
        id: 'p-mark-tag',
        prompt: 'To highlight a search term, wrap it in `<______>`.',
        blanks: [['mark']],
        hints: ['Like using a highlighter pen.'],
        explanation: '<mark> means "this text is relevant here" — browsers render it with a yellow background.',
      }),
    ],
    quiz: [
      question(
        'Which element makes text bold *and* semantically important?',
        ['`<strong>`', '`<b>`', '`<mark>`'],
        0,
        '<strong> tells both the browser and assistive tech that this matters.',
      ),
      question(
        'Which element is used for a footnote-style number, like x²?',
        ['`<sup>`', '`<sub>`', '`<small>`'],
        0,
        '<sup> is superscript (raised), <sub> is subscript (lowered).',
      ),
    ],
  }),
]
