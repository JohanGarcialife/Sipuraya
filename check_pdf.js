try {
    const pdf = require("pdf-parse/node");
    console.log("Type:", typeof pdf);
    console.log("Is Function?", typeof pdf === 'function');
    console.log("Keys:", Object.keys(pdf));
    if (typeof pdf === 'object') {
        console.log("Default:", pdf.default);
        console.log("PDFParse:", pdf.PDFParse);
    }
} catch (e) {
    console.error(e);
}
