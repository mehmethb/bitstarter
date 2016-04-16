#!/usr/bin/env node

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
  var instr = infile.toString();
  if(!fs.existsSync(instr)) {
    console.log("%s does not exist. Exiting.", instr);
    process.exit(1); //http://nodejs.org/api/process.html#process_process_exit_code
  }
  return instr;
}

var cheerioHtmlFile = function(htmlbuffer) {
  return cheerio.load(htmlbuffer);
}

var loadChecks = function(checksfile) {
  return JSON.parse(fs.readFileSync(checksfile));
}

function parseUrl(url, fun) {
  rest.get(url).on('complete', function(result) {
    if (result instanceof Error) {
      console.log('Error: ' + result.message);
      this.retry(5000); // try again after 5 sec
    } else {
      fun(result);
    }
  });
}

function parseFile(file, fun) {
  fs.readFile(file, function(err, data) {
    if (err) throw err;
    fun(data);
  });
}

var checkHtmlFile = function(htmlfile, checksfile) {
  $ = cheerioHtmlFile(htmlfile);
  var checks = loadChecks(checksfile).sort();
  var out = {};
  for(var ii in checks) {
    var present = $(checks[ii]).length > 0; //check if true
    out[checks[ii]] = present;
  }
  return out;
}

var clone = function(fn) {
  return fn.bind({});
}

if(require.main == module) {
  program
    .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
    .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
    .option('-u, --url <url>', 'url given') // a new option to get url
    .parse(process.argv);
  var cb = function(html) {
    var checkJson = checkHtmlFile(html, program.checks);
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);
  }
  if (program.url) {
    parseUrl(program.url, cb)
  } else {
    parseFile(program.file, cb);
  }
} else {
  exports.checkHtmlFile = checkHtmlFile;
}
