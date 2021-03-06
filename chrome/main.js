const REQUEST_FILTERS = [
  'main_frame',
  'sub_frame',
];
const EMPTY_SCRIPT = '// __CENSORED__';


async function main () {
  await browser.webRequest.handlerBehaviorChanged();

  browser.webRequest.onHeadersReceived.addListener(before, {
    urls: ['<all_urls>'],
    types: REQUEST_FILTERS,
  }, [
    'responseHeaders',
    'blocking',
  ]);
}


function before (details) {
  if (!isHTML(details.responseHeaders)) {
    return;
  }
  let isScript = details.type === 'script';
  let filter = browser.webRequest.filterResponseData(details.requestId);
  // TODO maybe not UTF-8
  let decoder = new TextDecoder('utf-8');
  let encoder = new TextEncoder();

  filter.ondata = (event) => {
    let content = decoder.decode(event.data, {
      stream: true,
    });
    if (isScript) {
      content = filterScript(content);
    } else {
      content = filterDocument(content);
    }
    content = encoder.encode(content);
    filter.write(content);
  };
}


function isHTML (headers) {
  for (let header of headers) {
    if (header.name.toLowerCase() !== 'content-type') {
      continue;
    }
    return header.value === 'text/html';
  }
  return false;
}


function filterScript (usScript) {
  let pattern = /setInterval\(function\(\)\{_0x\w+\(\);\},0xfa0\)/;
  if (pattern.test(usScript)) {
    return EMPTY_SCRIPT;
  }
  return usScript;
}


function filterDocument (usDocument) {
  let parser = new DOMParser();
  let doc = parser.parseFromString(usDocument, 'text/html');
  let scripts = doc.querySelectorAll('script');
  for (let script of scripts) {
    script.textContent = filterScript(script.textContent);
  }
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}


main().catch((e) => {
  console.warn('main fatal', e);
});
