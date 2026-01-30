
async function run() {
    try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        
        // Disable worker for Node usage
        // In some versions setting workerSrc to the file itself works as a "fake worker"
        // or using 'pdfjs-dist/legacy/build/pdf.worker.mjs'
        
        // pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'; 
        // Actually for Node.js main thread, we might not need to set it if using legacy? 
        // Let's try standard approach:
        
        console.log("PDFJS Loaded");
        
        // Create a dummy PDF buffer (or read a file if I had one, but I'll make a 1-byte buffer just to see if it intializes)
        // Better: require fs and read a file if possible, or failing that, just check objects.
        
        console.log("GlobalWorkerOptions:", pdfjs.GlobalWorkerOptions);
        
    } catch(e) {
        console.error("POC Failed:", e);
    }
}
run();
