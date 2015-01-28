var http = require('http');
var url = require('url');
var google = require('googleapis');
var gcal = google.calendar('v3');
var moment = require("moment");
// var intervals = require('interval-query');

var API_KEY = 'AIzaSyBkCOSjJG5k42IHENJhjLuc82ND_9uiiko';
var Q = require('q');

http.createServer(function(req, res) {
	res.writeHead(200, {
		"Content-Type": "text/plain"
	});

	var parts = url.parse(req.url, true);
	var dates = parts.path.split("/").splice(1);
	var from = new Date(dates[0]);
	var to = new Date(dates[1]);

	if (isFinite(from) && isFinite(to)) {
		var promises = [
            // Christopher's
			getEvents("hephst@gmail.com", from, to),
			getEvents("mja2d82ne5q3cbt7er628phldo@group.calendar.google.com", from, to),
			getEvents("f57mabcn00hv3vg27s0st1qa30@group.calendar.google.com", from, to),
			getEvents("917n0883ah89dmmcdl4lrgcc5s@group.calendar.google.com", from, to),
			getEvents("d92m0miiu0aro66mujopvk9h84@group.calendar.google.com", from, to),
			getEvents("po2em55f1eql8jgj9tjqp5a53c@group.calendar.google.com", from, to),
            // Johann's
            getEvents("jocbe.beleites@googlemail.com", from, to),
            getEvents("97to0b51b26j2ksl0rc8ve1bhc@group.calendar.google.com", from, to),
            getEvents("0trng9gd4r12ncelmfac7i29t4@group.calendar.google.com", from, to),
            getEvents("9hqoq97hnuemeg4o1uf52uaigs@group.calendar.google.com", from, to),
            getEvents("v2a24c955koo01nfqvgkp1pkt8@group.calendar.google.com", from, to),
            getEvents("oe54a1c43mferljf4plmpbu5io@group.calendar.google.com", from, to),
		];
		Q.all(promises)
			.then(function(eventss) {

				var arr = [];
				for (var i = 0; i < eventss.length; i++) {
					for (var j = 0; j < eventss[i].length; j++) {
						// TODO: adjust lectures for time to get to/from lab
						arr.push({
							start: new Date(eventss[i][j].start.dateTime || eventss[i][j].start.date),
							end: new Date(eventss[i][j].end.dateTime || eventss[i][j].end.date)
						});
					}
				}

				return arr.sort(function(a, b) {
					return a.start.getTime() - b.start.getTime();
				});
			})
			.then(function(events) {
				if (events.length < 1) return [];
				// merge overlaps
				var merged = [events[0]];

				for (var i = 1; i < events.length; i++) {
					var top = merged[merged.length - 1];
					if (top.end.getTime() < events[i].start.getTime()) {
						// no overlap - push a new event to the merged list
						merged.push(events[i]);
					} else if (top.end.getTime() < events[i].end.getTime()) {
						// overlap - extend the last interval
						top.end = events[i].end;
					}

				}

				return merged;

			})
			.then(function(events) {
				var days = [];
				var oneDay = 24*60*60*1000;	// hours*minutes*seconds*milliseconds
				var nowDay = new Date(from.getTime() + oneDay);
				var i=0;
				while (nowDay.getTime() < to.getTime() + oneDay) {
					days.push([]);
					while (events[i] !== undefined && events[i].start.getTime() < nowDay.getTime()) {
						days[days.length-1].push(events[i]);
						i++;
					}
					nowDay.setTime(nowDay.getTime() + oneDay);
				}
				return days;
			})
			.then(function(days) {
				var str = "";

				var oneDay = 24*60*60*1000;	// hours*minutes*seconds*milliseconds
				var nowDay = moment(from.getTime() + oneDay);
				for (var i=0; i<days.length; i++) {
					var ranges = [];
                
					for (var j=0; j<days[i].length; j++) {
						var s = toString(days[i][j].start);
						var e = toString(days[i][j].end);
                        ranges.push(s + "-" + e) ;
					}

                    var d = nowDay.format('ddd, Do MMM');
					str += padStr(d, 13) + ": " + ranges.join("; ") + "\n";
					nowDay.add(1, 'd');
				}
				res.write(str);
				res.end();
			})
			.fail(function(err) {
				res.write("" + err);
				res.end();
			});

	} else {
        res.write("Urls should be of the form /startDate/endDate");
        res.end();
    }
}).listen(3010);
function padStr(s, l) {
    l = l - s.length;
    for (var i=0; i<l; i++ ){
        s += " ";
    }
    return s;
}
function date(d) {
    var dd = d.getDate();
    var mm = d.getMonth()+1; //January is 0!

    var yyyy = d.getFullYear();
    if(dd<10){
        dd='0'+dd;
    } 
    if(mm<10){
        mm='0'+mm;
    } 
    return yyyy + "-" + mm + "-" + dd;
}
function toString(d) {
    var h = d.getUTCHours();
    var m = d.getUTCMinutes();
    return pad(h)  + ":" + pad(m);
}
function pad(num) {
	if (num < 10) {
		return "0" + num;
	}
	return "" + num;
}

function getEvents(calendar, from, to) {

	var def = Q.defer();
	gcal.events.list({
		auth: API_KEY,
		calendarId: calendar,
		timeMin: from.toISOString(),
		timeMax: to.toISOString()
	}, function(err, events) {
		if (err) def.reject(err);
		else def.resolve(events.items);
	});
	return def.promise;
}
