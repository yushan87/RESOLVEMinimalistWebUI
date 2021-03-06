/* global ace decode getVCs */

//////////////////////
// Global Variables //
//////////////////////

var aceEditor; // This is the ACE Editor embedded to the page.
var lineVCMap; // This contains vc information for each line in the current file.
var ResolveMode; // RESOLVE mode for ACE Editor.
var vcAceEditor; // This is the ACE Editor in our modal.
var vcs; // This stores the VCs for the current file.
var verifying = false; // A flag that indicates whether or not the verify button has been clicked.

///////////////////////////////////////
// Main ACE Editor-Related Functions //
///////////////////////////////////////

/*
 * Function for creating and embedding the ACE Editor into our page.
 */
function createEditor() {
    ResolveMode = ace.require("ace/mode/resolve").Mode;
    Range = ace.require("ace/range").Range;

    // Basic editor settings
    aceEditor = ace.edit("editor");
    aceEditor.setTheme("ace/theme/tomorrow");
    aceEditor.setFontSize(16);

    // YS: Remove the following lines!
    aceEditor.getSession().setValue(decode("Realization%20Iterative_Append_Realiz%20for%20Append_Capability%20of%20Queue_Template%3B%0A%20%20%20%20--%20will%20not%20verify%20because%20loop%20invariant%20is%20not%20adequate%0A%20%20%20%20Procedure%20Append%28updates%20P%3A%20Queue%3B%20clears%20Q%3A%20Queue%29%3B%0A%20%20%20%20%20%20%20%20Var%20E%3A%20Entry%3B%0A%0A%20%20%20%20%20%20%20%20While%20%28%201%20%3C%3D%20Length%28Q%29%20%29%0A%20%20%20%20%20%20%20%20%20%20--%20fill%20in%20a%20suitable%20invariant%0A%20%20%20%20%20%20%20%20%20%20maintaining%20true%3B%0A%20%20%20%20%20%20%20%20%20%20decreasing%20%7CQ%7C%3B%0A%20%20%20%20%20%20%20%20do%0A%20%20%20%20%20%20%20%20%20%20Dequeue%28E%2CQ%29%3B%0A%20%20%20%20%20%20%20%20%20%20Enqueue%28E%2CP%29%3B%0A%20%20%20%20%20%20%20%20end%3B%0A%20%20%20%20end%20Append%3B%0Aend%20Iterative_Append_Realiz%3B"));

    // Set this to RESOLVE mode
    aceEditor.getSession().setMode(new ResolveMode());

    // Disable ACE Editor's breakpoint toggling.
    aceEditor.on("guttermousedown", disableBreakpoint);

    // Add tooltip that indicates you can click on VC icon.
    aceEditor.on("guttermousemove", showGutterTooltip);

    // Load modal to show VC(s) details.
    aceEditor.on("gutterclick", showVCDetails);

    // If we detect the document's content has changed, we clear
    // any stored VC information.
    aceEditor.on("change", clearVCs);
}

////////////////////////////////////
// Functions Passed to ACE Editor //
////////////////////////////////////

/*
 * Function for unlocking the verify button.
 */
function clearVCs() {
    vcs = null;

    // Remove all VC icons
    var totalLines = aceEditor.getSession().getLength();
    for (var i = 0; i < totalLines; i++) {
        aceEditor.getSession().removeGutterDecoration(i, "ace_vc");
    }
}

/*
 * Function for disabling ACE editor breakpoint toggling.
 */
function disableBreakpoint(e) {
    var region = e.editor.renderer.$gutterLayer.getRegion(e);
    if (region == "markers") {
        e.stop(); // prevent breakpoint toggling
    }
}

/*
 * Function for showing tooltip on an VC icon.
 */
function showGutterTooltip(e) {
    var region = e.editor.renderer.$gutterLayer.getRegion(e);
    var target = e.domEvent.target;
    if (region == "markers") {
        e.stop();

        // Only do this if the gutter has the "ace_vc" class
        if ($(target).hasClass("ace_vc")) {
            // Create a tooltip that show that you can click on it.
            $(target).tooltip({
                placement: "bottom",
                template: "<div class=\"tooltip\" role=\"tooltip\"><div class=\"tooltip-inner\"></div></div>",
                title: "Click VC icon for details!"
            });
            $(target).tooltip("show");
        }
    }
}

/*
 * Function for showing a modal with VC(s) details.
 */
function showVCDetails(e) {
    var region = e.editor.renderer.$gutterLayer.getRegion(e);
    var target = e.domEvent.target;
    if (region == "markers") {
        e.stop();

        // Only do this if the gutter has the "ace_vc" class
        // and the VC modal isn't shown.
        if ($(target).hasClass("ace_vc")) {
            var line = e.getDocumentPosition().row;
            populateVCInfo(line);

            // Hide tooltip
            $(target).tooltip("hide");

            // Show VC modal
            $("#vcModal").modal("show");
        }
    }
}

////////////////////////////////
// VC Modal-Related Functions //
////////////////////////////////

/*
 * Function for clearing all content in VC Modal.
 */
function clearContentInModal() {
    // Delete all tabs
    $("#vcTab").empty();

    // Delete all tab content
    $("#vcTabContent").empty();

    // Set the contents of the editor to empty string.
    vcAceEditor.getSession().setValue("");
}

/*
 * Function for creating and embedding the ACE Editor into the VC modal.
 */
function createVCEditor() {
    // VC Editor settings
    vcAceEditor = ace.edit("vcEditor");
    vcAceEditor.setTheme("ace/theme/tomorrow");
    vcAceEditor.setFontSize(16);
    vcAceEditor.setReadOnly(true);
    vcAceEditor.getSession().setMode(new ResolveMode());

    // Show 3 lines
    vcAceEditor.setOption("maxLines", 3);
    vcAceEditor.setOption("minLines", 3);

    // No scrollbars
    vcAceEditor.setOption("hScrollBarAlwaysVisible", false);
    vcAceEditor.setOption("vScrollBarAlwaysVisible", false);

    // Don't highlight anything
    vcAceEditor.setOption("highlightActiveLine", false);
    vcAceEditor.setOption("highlightSelectedWord", false);
    vcAceEditor.setOption("highlightGutterLine", false);

    // Resize the editor
    vcAceEditor.resize();

    // Clear any lines stored inside vc modal when it is hidden
    $("#vcModal").on("hide.bs.modal", clearContentInModal);
}

/*
 * Function for creating the proper HTML in the VC modal
 * to render a VC object.
 */
function createVCTabs(vc, isActive) {
    // IDs for the different HTML objects.
    var detailDivID = "vc_" + vc.vcID + "_detail";
    var tabLinkID = "vc_" + vc.vcID + "_tab";

    // New HTML Object #1: VC Detail Content
    var vcContentCode = document.createElement("code");
    vcContentCode.innerHTML = displayVCInfo(vc.given, vc.goal, decode(vc.step));

    var vcContentPre = document.createElement("pre");
    vcContentPre.setAttribute("class", "my-2");
    vcContentPre.appendChild(vcContentCode);

    // New HTML Object #1: VC Detail Div
    var detailDiv = document.createElement("div");
    detailDiv.setAttribute("id", detailDivID);

    if (isActive) {
        // Add 'show' and 'active'
        detailDiv.setAttribute("class", "tab-pane fade show active");
    } else {
        detailDiv.setAttribute("class", "tab-pane fade");
    }

    detailDiv.setAttribute("role", "tabpanel");
    detailDiv.setAttribute("aria-labelledby", tabLinkID);
    detailDiv.appendChild(vcContentPre);

    // New HTML Object #2: Tab Link
    var tabLink = document.createElement("a");
    tabLink.setAttribute("id", tabLinkID);

    if (isActive) {
        // Add 'active'
        tabLink.setAttribute("class", "nav-link active");
    } else {
        tabLink.setAttribute("class", "nav-link");
    }

    tabLink.setAttribute("data-toggle", "tab");
    tabLink.setAttribute("href", "#" + detailDivID);
    tabLink.setAttribute("role", "tab");
    tabLink.setAttribute("aria-controls", detailDivID);
    tabLink.setAttribute("aria-selected", isActive);
    tabLink.appendChild(document.createTextNode("VC " + vc.vcID));

    // New HTML Object #3: Tab
    var tabLi = document.createElement("li");
    tabLi.setAttribute("class", "nav-item");
    tabLi.appendChild(tabLink);

    // Add the tab and vc detail div
    $("#vcTab").append(tabLi);
    $("#vcTabContent").append(detailDiv);
}

/*
 * Function for converting a resulting VC content into
 * proper HTML object.
 */
function displayVCInfo(givens, goals, detail) {
    var detailString = "<strong>" + detail + "</strong>\n\n";
    var goalsString = "<strong>Goal(s):</strong>\n\n" + goals + "\n";
    var givensString = "<strong>Given(s):</strong>\n\n" + givens;

    return detailString + goalsString + givensString;
}

/*
 * Function for populating VC information.
 */
function populateVCInfo(lineNum) {
    var editorLength = aceEditor.getSession().getLength();
    var range;

    if (lineNum === 0 || lineNum === 1) {
        // Special handling if we are at the beginning of the document.
        range = new Range(0, 0, 2, Number.MAX_VALUE);
    } else if (lineNum === editorLength - 1 || lineNum === editorLength - 2) {
        // Special handling if we are at the end of the document.
        range = new Range(editorLength - 3, 0, editorLength - 1, Number.MAX_VALUE);
    } else {
        range = new Range(lineNum - 1, 0, lineNum + 1, Number.MAX_VALUE);
    }

    // Set the starting line number
    vcAceEditor.setOption("firstLineNumber", lineNum);

    // Store the content to the VC editor
    var selectedContent = aceEditor.getSession().getTextRange(range);
    vcAceEditor.getSession().setValue(selectedContent);

    // Add the icon to the gutter.
    vcAceEditor.getSession().addGutterDecoration(lineNum - 1, "ace_vc");

    // Add a marker to that line
    vcAceEditor.getSession().addMarker(new Range(lineNum - 1, 0, lineNum, 0), "vc_info");

    // Create new tabs to display all the VCs on this line
    var vcsAtLine = lineVCMap.get(lineNum);
    for (var i = 0; i < vcsAtLine.length; i++) {
        createVCTabs(vcsAtLine[i], i == 0);
    }

    // Resize the editor
    vcAceEditor.resize();
}

///////////////////////////////
// Toolbar-Related Functions //
///////////////////////////////

/*
 * Function for increasing the editor's font size.
 */
$("#fontIncrease").click(function () {
    // Increase font size
    var currentFontSize = $("#editor").css("font-size");
    currentFontSize = parseFloat(currentFontSize) * 1.2;
    $("#editor").css("font-size", currentFontSize);

    return false;
});

/*
 * Function for decreasing the editor's font size.
 */
$("#fontDecrease").click(function () {
    // Decrease font size
    var currentFontSize = $("#editor").css("font-size");
    currentFontSize = parseFloat(currentFontSize) / 1.2;
    $("#editor").css("font-size", currentFontSize);

    return false;
});

/*
 * Function for handling the verify button
 */
function submit() {
    // Protect against multiple requests
    if (verifying) {
        return;
    }

    // Locking the verify button.
    lock();

    // YS: Modify the following once we invoke the compiler
    vcs = getVCs();
    lineVCMap = new Map();
    for (var i = 0; i < vcs.length; i++) {
        var lineNum = Number(vcs[i].line);

        // Check to see if we need to add the icon.
        if (lineVCMap.get(lineNum) === undefined) {
            // Add the icon to the gutter.
            aceEditor.session.addGutterDecoration(lineNum, "ace_vc");

            // Create a new array for this line number
            lineVCMap.set(lineNum, []);
        }

        // Update our list of vcs on that line number
        var vcsAtLine = lineVCMap.get(lineNum);
        vcsAtLine.push(vcs[i]);
        lineVCMap.set(lineNum, vcsAtLine);
    }

    // Unlock the verify button.
    unlock();
}

/*
 * Function for locking the verify button.
 */
function lock() {
    // Make sure we don't have any leftover VCs from the previous run.
    clearVCs();

    // Lock the editors
    aceEditor.setReadOnly(true);
    vcAceEditor.setReadOnly(true);

    // Disable the button and set verifying to true.
    $("#verifyButton").attr("disabled", "disabled");
    verifying = true;
}

/*
 * Function for unlocking the verify button.
 */
function unlock() {
    // Unlock the editors
    aceEditor.setReadOnly(false);
    vcAceEditor.setReadOnly(false);

    // No longer verifying, so enable the button again.
    verifying = false;
    $("#verifyButton").removeAttr("disabled", "disabled");

    // Focus on the editor.
    aceEditor.focus();
}
