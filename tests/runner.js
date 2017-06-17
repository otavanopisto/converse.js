/*global config */

// Extra test dependencies
config.paths.mock = "tests/mock";
config.paths['wait-until-promise'] = "node_modules/wait-until-promise/index";
config.paths['test-utils'] = "tests/utils";
config.paths.sinon = "node_modules/sinon/pkg/sinon";
config.paths.transcripts = "converse-logs/converse-logs";
config.paths.jasmine = "node_modules/jasmine-core/lib/jasmine-core/jasmine";
config.paths.boot = "node_modules/jasmine-core/lib/jasmine-core/boot";
config.paths["jasmine-console"] = "node_modules/jasmine-core/lib/console/console";
config.paths["jasmine-html"] = "node_modules/jasmine-core/lib/jasmine-core/jasmine-html";
// config.paths["console-runner"] = "node_modules/phantom-jasmine/lib/console-runner";
config.shim.jasmine = {
    exports: 'window.jasmineRequire'
};
config.shim['jasmine-html'] = {
    deps: ['jasmine'],
    exports: 'window.jasmineRequire'
};
config.shim['jasmine-console'] = {
    deps: ['jasmine'],
    exports: 'window.jasmineRequire'
};
config.shim.boot = {
    deps: ['jasmine', 'jasmine-html', 'jasmine-console'],
    exports: 'window.jasmine'
};

require.config(config);

// Polyfill 'bind' which is not available in phantomjs < 2.0
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }
        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
                aArgs.concat(Array.prototype.slice.call(arguments)));
            };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}

var specs = [
    //"spec/transcripts",
    // "spec/profiling",
    "spec/utils",
    //"spec/converse",
    //"spec/bookmarks",
    //"spec/roomslist",
    //"spec/headline",
    //"spec/disco",
    //"spec/protocol",
    //"spec/presence",
    //"spec/eventemitter",
    //"spec/ping",
    //"spec/xmppstatus",
    //"spec/mam",
    //"spec/otr",
    //"spec/controlbox",
    //"spec/chatbox",
    //"spec/chatroom",
    //"spec/minchats",
    //"spec/notification",
    //"spec/register"
];

require(['jquery', 'mock', 'boot', 'sinon', 'wait-until-promise', 'pluggable'],
        function($, mock, jasmine, sinon, waitUntilPromise, pluggable) {
    window.sinon = sinon;
    window.waitUntilPromise = waitUntilPromise['default'];
    window.localStorage.clear();
    window.sessionStorage.clear();

    var jasmineEnv = jasmine.getEnv();

    var noopTimer = {
        start: function(){},
        elapsed: function(){ return 0; }
    };
    function ConsoleReporter(options) {
        var print = options.print,
            showColors = options.showColors || false,
            onComplete = options.onComplete || function() {},
            timer = options.timer || noopTimer,
            specCount,
            failureCount,
            failedSpecs = [],
            pendingCount,
            ansi = {
                green: '\x1B[32m',
                red: '\x1B[31m',
                yellow: '\x1B[33m',
                none: '\x1B[0m'
            },
            failedSuites = [];

        this.jasmineStarted = function() {
            specCount = 0;
            failureCount = 0;
            pendingCount = 0;
            print('Started');
            printNewline();
            timer.start();
        };

        this.jasmineDone = function() {
            print("jasmineDone");
            printNewline();
            for (var i = 0; i < failedSpecs.length; i++) {
                specFailureDetails(failedSpecs[i]);
            }

            if(specCount > 0) {
                printNewline();

                var specCounts = specCount + ' ' + plural('spec', specCount) + ', ' +
                failureCount + ' ' + plural('failure', failureCount);

                if (pendingCount) {
                specCounts += ', ' + pendingCount + ' pending ' + plural('spec', pendingCount);
                }

                print(specCounts);
            } else {
                print('No specs found');
            }

            printNewline();
            var seconds = timer.elapsed() / 1000;
            print('Finished in ' + seconds + ' ' + plural('second', seconds));
            printNewline();

            for(i = 0; i < failedSuites.length; i++) {
                suiteFailureDetails(failedSuites[i]);
            }

            onComplete(failureCount === 0);
        };

        this.specDone = function(result) {
            specCount++;
            if (result.status == 'pending') {
                pendingCount++;
                print(colored('yellow', '*'));
                return;
            }
            if (result.status == 'passed') {
                print(colored('green', '.'));
                return;
            }
            if (result.status == 'failed') {
                failureCount++;
                failedSpecs.push(result);
                print(colored('red', 'F'));
            }
        };

        this.suiteDone = function(result) {
            if (result.failedExpectations && result.failedExpectations.length > 0) {
                failureCount++;
                failedSuites.push(result);
            }
            print("suiteDone");
            printNewline();
        };
        return this;

        function printNewline() {
            print('\n');
        }

        function colored(color, str) {
            return showColors ? (ansi[color] + str + ansi.none) : str;
        }

        function plural(str, count) {
            return count == 1 ? str : str + 's';
        }

        function repeat(thing, times) {
            var arr = [];
            for (var i = 0; i < times; i++) {
                arr.push(thing);
            }
            return arr;
        }

        function indent(str, spaces) {
            var lines = (str || '').split('\n');
            var newArr = [];
            for (var i = 0; i < lines.length; i++) {
                newArr.push(repeat(' ', spaces).join('') + lines[i]);
            }
            return newArr.join('\n');
        }

        function specFailureDetails(result) {
            printNewline();
            print(result.fullName);

            for (var i = 0; i < result.failedExpectations.length; i++) {
                var failedExpectation = result.failedExpectations[i];
                printNewline();
                print(indent(failedExpectation.message, 2));
                print(indent(failedExpectation.stack, 2));
            }
            printNewline();
        }

        function suiteFailureDetails(result) {
            for (var i = 0; i < result.failedExpectations.length; i++) {
                printNewline();
                print(colored('red', 'An error was thrown in an afterAll'));
                printNewline();
                print(colored('red', 'AfterAll ' + result.failedExpectations[i].message));
            }
            printNewline();
        }
    }

    var consoleReporter = new ConsoleReporter({
        print: function print(message) {
            console.log(message + '\x03\b');
        },
        onComplete: function onComplete(isSuccess) {
            var exitCode = isSuccess ? 0 : 1;
            console.info('All tests completed!' + exitCode);
        },
        showColors: true
    });
    jasmineEnv.addReporter(consoleReporter);

    // Load the specs
    require(specs, function () {
        // Initialize the HTML Reporter and execute the environment (setup by `boot.js`)
        // http://stackoverflow.com/questions/19240302/does-jasmine-2-0-really-not-work-with-require-js
        window.onload();
    });
});
