console.log("contentscript.js invoked");

//declare CSS selectors
var classSelector = ".cssClassContainer";
var daySelector = ".cssTtbleColDay";
var subjectSelector = ".cssTtableSspNavContainer"

//find subject and class count
var message = {
	greeting: "pageData",
	classCount: document.querySelectorAll(classSelector).length,
	subjectCount: document.querySelectorAll(subjectSelector).length
};
//send this to the popup
chrome.runtime.sendMessage(message, function(response) {
	console.log(response.farewell);
});

//build subject code -> subject name dictionary
var subjectMap = {};
console.log("Building subject code->name map");
$(".cssTtableSspNavContainer").each(function() {
	var cc = $(".cssTtableSspNavMasterSpkInfo2 span", this).text();
	var name =  $(".cssTtableSspNavMasterSpkInfo3 div:first", this).text().trim();
	console.log(cc+" -> "+name);
	subjectMap[cc]=name;
})

var makeIcs = function(weekEvents) {
	if (weekEvents !== true) weekEvents = false;
	//set up semester boundaries
	var startingDate = new Date("28 July, 2014");
	var endingDate = new Date("26 October, 2014");
	var breakStartDate = new Date("29 September, 2014");

	var dateFormat = function(rawtime, day) {
		//date fields on page don't match dateSting format for JavaScript
		//need to add a space before am/pm and seconds field
		//rawtime is attached to the given day (date) and returned as a string
		var slicePosition = rawtime.length - 2;
		var newdate = rawtime.slice(0,slicePosition)+':00 '+ rawtime.slice(slicePosition,rawtime.length);
		return day.toDateString() + " " + newdate;
	};

	//initialise icalendar library
	var cal = ics();

	$(daySelector).each(function(dayIndex){
		//iterating over each weekday
		//set up variable for the day of the week
		var weekDay = new Date(startingDate.getTime() + dayIndex*(24 * 60 * 60 * 1000));
		//set up variable for the mid-semester break offset (used for exlusion)
		var exludeDay = new Date(breakStartDate.getTime() + dayIndex*(24 * 60 * 60 * 1000));
		console.log("DAY #"+dayIndex);
		$(classSelector, this).each(function(index){
			//iterating over each subject in a weekday
			//collect data
			var subjectCode = $(".cssTtableHeaderPanel", this).text().replace(/[\n\t\r]/g,"");
			//add subject name if found
			if (subjectMap[subjectCode]!==undefined) subjectCode += " "+subjectMap[subjectCode];
			var name = $(".cssTtableClsSlotWhat", this).text().trim();
			var start = dateFormat($(".cssHiddenStartTm", this).val(),weekDay);
			var end = dateFormat($(".cssHiddenEndTm", this).val(),weekDay);
			var location = $(".cssTtableClsSlotWhere", this).text();
			//determine exlusion date
			var exludeDate = dateFormat($(".cssHiddenStartTm", this).val(),exludeDay);
			//log and process into event
			console.log(subjectCode + " " + name + " @ " + location + " \n" + start + " -> " + end + " except "+exludeDate);
			cal.addEvent(subjectCode+" "+name, name, location, start, end, endingDate, exludeDate);
		});
	});
	if (weekEvents) {
		//create an event for each week #
		var passedBreak = false;
		for(var weeknum=1;weeknum<=13;weeknum++) {
			var actualWeekNum = weeknum;
			if (passedBreak) {
				actualWeekNum--;
			}
			var eventName = "Week #"+actualWeekNum.toString();
			var eventDescription = "University calendar week "+actualWeekNum.toString()

			var weekStartDate = new Date(startingDate.toDateString());
			weekStartDate.setDate(weekStartDate.getDate()+7*(weeknum-1));
			if (weekStartDate.toDateString() == breakStartDate.toDateString()) {
				//this week is the break week
				passedBreak = true;
				eventName = "Mid-semester break";
				eventDescription = "University non-teaching period";
			}
			var weekEndDate = new Date(weekStartDate.toDateString());
			weekEndDate.setDate(weekStartDate.getDate()+5);
			cal.addEvent(eventName, eventDescription, "", weekStartDate, weekEndDate);
		}
	}
	//download ics
	cal.download("yourCal");
};

//attach listener from popup
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		if (request.greeting == "makeIcs") {
			makeIcs(request.weeklyEvents);
			sendResponse({farewell: "executed makeIcs()"});
		}
	}
);