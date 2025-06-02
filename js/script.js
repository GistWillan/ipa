// public/js/script.js

let allIpas = [];
let filteredIpas = [];
let currentPage = 1;
const itemsPerPage = 20; // Number of IPAs per page, increased from 10 to 20

// IMPORTANT: Replace this with the URL of your deployed external proxy API
// Example: const EXTERNAL_PROXY_API_URL = 'https://your-serverless-function-domain.com/get-onedrive-download-link';
const EXTERNAL_PROXY_API_URL = 'https://external-proxy-server.vercel.app'; 

document.addEventListener('DOMContentLoaded', () => {
    // Check for iOS version and resolution for old style
    checkDeviceAndApplyOldStyle();

    // Fetch IPAs when the page loads
    fetchIpas();

    // Event listener for search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentPage = 1; // Reset to first page on new search
            filterAndDisplayIpas();
        });
    }

    // Event listener for "View All IPA" button
    const viewAllBtn = document.getElementById('viewAllIpasBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', () => {
            searchInput.value = ''; // Clear search input
            currentPage = 1; // Reset to first page
            filterAndDisplayIpas();
        });
    }
});

// Function to check device and apply old iOS style
function checkDeviceAndApplyOldStyle() {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);

    if (isIOS) {
        const iOSVersionMatch = userAgent.match(/OS (\d+)_(\d+)/);
        let iOSVersion = 0;
        if (iOSVersionMatch && iOSVersionMatch.length >= 2) {
            iOSVersion = parseInt(iOSVersionMatch[1], 10);
        }

        // Check for iPhone 5 resolution (320x568 or 568x320)
        const isiPhone5Resolution = (window.screen.width === 320 && window.screen.height === 568) ||
                                   (window.screen.width === 568 && window.screen.height === 320);

        if (iOSVersion < 10 && isiPhone5Resolution) {
            console.log('Detected old iOS device (iOS < 10, iPhone 5 resolution). Applying iOS 6 style.');
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'css/ios6_style.css';
            document.head.appendChild(link);
            document.body.classList.add('ios6-style-active'); // Add a class for potential JS-based style adjustments
        }
    }
}

// Function to fetch IPAs from the backend or local JSON (for static site)
async function fetchIpas() {
    try {
        let response;
        // Check if running on a static site (e.g., GitHub Pages) by checking if tool.html exists
        // This is a simple heuristic, a more robust check might involve a build flag
        const isStaticSite = !window.location.href.includes('localhost:3000');

        if (isStaticSite) {
            // For static site, fetch from local ipas.json
            response = await fetch('ipas.json'); // ipas.json will be in the same directory as download.html
        } else {
            // For local development with backend
            response = await fetch('/api/ipas');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allIpas = await response.json();
        console.log('Fetched IPAs:', allIpas);
        filterAndDisplayIpas(); // Display IPAs after fetching
    } catch (error) {
        console.error('Error fetching IPAs:', error);
        displayMessage('错误', '无法加载IPA列表。请稍后再试。');
    }
}

// Function to filter and display IPAs based on search input and current page
function filterAndDisplayIpas() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    filteredIpas = allIpas.filter(ipa =>
        ipa.name.toLowerCase().includes(searchTerm) ||
        ipa.path.toLowerCase().includes(searchTerm) // Search by path as well
    );

    renderIpaList();
    renderPagination();
}

// Function to render the IPA list for the current page
function renderIpaList() {
    const ipaListContainer = document.getElementById('ipaList');
    if (!ipaListContainer) return;

    ipaListContainer.innerHTML = ''; // Clear previous list

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const ipasToDisplay = filteredIpas.slice(startIndex, endIndex);

    if (ipasToDisplay.length === 0) {
        ipaListContainer.innerHTML = '<p style="text-align: center; color: #777;">没有找到IPA应用。</p>';
        return;
    }

    ipasToDisplay.forEach(ipa => {
        const ipaItem = document.createElement('div');
        ipaItem.classList.add('ipa-item');

        // Extract file extension for display
        const fileNameParts = ipa.name.split('.');
        const fileExtension = fileNameParts.length > 1 ? fileNameParts.pop().toUpperCase() : 'UNKNOWN';
        const baseFileName = fileNameParts.join('.');

        ipaItem.innerHTML = `
            <h3>${baseFileName}</h3>
            <p><strong>大小:</strong> ${(ipa.size / (1024 * 1024)).toFixed(2)} MB</p>
            <p><strong>路径:</strong> ${ipa.path}</p>
            <p><strong>上传时间:</strong> ${new Date(ipa.uploadedAt).toLocaleDateString()}</p>
            <button class="download-btn" data-ipa-id="${ipa.id}">下载</button>
        `;
        // Add event listener to the button
        const downloadBtn = ipaItem.querySelector('.download-btn');
        downloadBtn.addEventListener('click', () => handleDownloadClick(ipa.id, downloadBtn));

        ipaListContainer.appendChild(ipaItem);
    });
}

// Function to handle download button click and fetch real-time URL
async function handleDownloadClick(ipaId, buttonElement) {
    if (!EXTERNAL_PROXY_API_URL || EXTERNAL_PROXY_API_URL === 'YOUR_EXTERNAL_PROXY_API_URL_HERE') {
        displayMessage('配置错误', '请在 script.js 中配置 EXTERNAL_PROXY_API_URL。');
        return;
    }

    const originalButtonText = buttonElement.textContent;
    buttonElement.textContent = '正在获取链接...';
    buttonElement.disabled = true;

    try {
        const response = await fetch(`${EXTERNAL_PROXY_API_URL}?ipaId=${ipaId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.downloadUrl) {
            window.location.href = data.downloadUrl; // Redirect to the fresh download URL
        } else {
            displayMessage('下载失败', '未能获取到下载链接。');
        }
    } catch (error) {
        console.error('Error fetching real-time download URL:', error);
        displayMessage('下载失败', `获取下载链接时发生错误: ${error.message}`);
    } finally {
        buttonElement.textContent = originalButtonText;
        buttonElement.disabled = false;
    }
}


// Function to render pagination buttons
function renderPagination() {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = ''; // Clear previous pagination

    const totalPages = Math.ceil(filteredIpas.length / itemsPerPage);

    if (totalPages <= 1) {
        return; // No pagination needed for 1 or fewer pages
    }

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.textContent = '上一页';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        currentPage--;
        filterAndDisplayIpas();
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    });
    paginationContainer.appendChild(prevButton);

    // Page number buttons logic
    const maxPageButtons = 5; // Max number of page buttons to show (e.g., 1, 2, 3, ..., N)
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    if (endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    if (startPage > 1) {
        const firstPageButton = document.createElement('button');
        firstPageButton.textContent = '1';
        firstPageButton.addEventListener('click', () => {
            currentPage = 1;
            filterAndDisplayIpas();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationContainer.appendChild(firstPageButton);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.margin = '0 5px';
            paginationContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === currentPage);
        pageButton.addEventListener('click', () => {
            currentPage = i;
            filterAndDisplayIpas();
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
        });
        paginationContainer.appendChild(pageButton);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.margin = '0 5px';
            paginationContainer.appendChild(ellipsis);
        }
        const lastPageButton = document.createElement('button');
        lastPageButton.textContent = totalPages;
        lastPageButton.addEventListener('click', () => {
            currentPage = totalPages;
            filterAndDisplayIpas();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        paginationContainer.appendChild(lastPageButton);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = '下一页';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        currentPage++;
        filterAndDisplayIpas();
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top
    });
    paginationContainer.appendChild(nextButton);
}

// Custom message box function
function displayMessage(title, message, callback) {
    let messageBoxOverlay = document.getElementById('messageBoxOverlay');
    if (!messageBoxOverlay) {
        messageBoxOverlay = document.createElement('div');
        messageBoxOverlay.id = 'messageBoxOverlay';
        messageBoxOverlay.classList.add('message-box-overlay');
        document.body.appendChild(messageBoxOverlay);

        messageBoxOverlay.innerHTML = `
            <div class="message-box">
                <h4 id="messageBoxTitle"></h4>
                <p id="messageBoxContent"></p>
                <button id="messageBoxCloseBtn">确定</button>
            </div>
        `;
    }

    document.getElementById('messageBoxTitle').textContent = title;
    document.getElementById('messageBoxContent').textContent = message;

    const closeBtn = document.getElementById('messageBoxCloseBtn');
    closeBtn.onclick = () => {
        messageBoxOverlay.classList.remove('show');
        if (callback) callback();
    };

    messageBoxOverlay.classList.add('show');
}
