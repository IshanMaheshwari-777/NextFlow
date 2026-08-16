// Some hosts (e.g. w3schools.com) 403 requests with no User-Agent, which Transloadit's
// /http/import robot sends by default — surfacing as HTTP_IMPORT_ACCESS_DENIED even though
// the URL is publicly reachable from a normal browser.
export const HTTP_IMPORT_HEADERS = [
  "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];
