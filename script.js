function generateLifeGraph(event) {
    // Check if event exists so we can call this programmatically without an event object
    if (event) event.preventDefault();

    const dateInput = document.getElementById('birth-date').value;
    const expectancyInput = document.getElementById('life-expectancy').value;

    if (!dateInput) return;

    localStorage.setItem('birthDate', dateInput);
    localStorage.setItem('lifeExpectancy', expectancyInput);

    // Make it shareable by silently updating the URL
    const url = new URL(window.location);
    url.searchParams.set('birth', dateInput);
    url.searchParams.set('exp', expectancyInput);
    window.history.replaceState({}, '', url);

    // Timezone Fix: Extract parts manually to avoid UTC shift
    const [year, month, day] = dateInput.split('-');
    const birthDate = new Date(year, month - 1, day);
    birthDate.setHours(0, 0, 0, 0);

    const lifeExpectancy = expectancyInput !== '' ? parseInt(expectancyInput) : 96;

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (birthDate > currentDate) {
        alert("You can't be from the future.");
        return;
    }

    let monthsLived = (currentDate.getFullYear() - birthDate.getFullYear()) * 12 + (currentDate.getMonth() - birthDate.getMonth());
    if (monthsLived > 0 && currentDate.getDate() < birthDate.getDate()) {
        monthsLived -= 1;
    }

    const monthsExpected = lifeExpectancy * 12;
    const monthsDelta = monthsExpected - monthsLived;

    const graph = document.getElementById('graph');
    graph.innerHTML = '';

    // Performance Fix: Use DocumentFragment to batch DOM inserts
    const fragment = document.createDocumentFragment();

    for (let m = 0; m < Math.max(monthsLived, monthsExpected); m++) {
        const cell = document.createElement('span');
        cell.classList.add('cell');

        // Visual flair: A cascading delay based on the month index.
        // It speeds up as it gets further out, maxing out at a 2.5-second total wait so users aren't staring at a blank screen.
        const cascadeDelay = Math.min(m * 2.5, 2500);
        cell.style.animationDelay = `${cascadeDelay}ms`;

        if (m < Math.min(monthsLived, monthsExpected)) {
            cell.classList.add('lived-expected');
        } else {
            if (monthsDelta >= 0) {
                cell.classList.add('unlived-expected');
            } else {
                cell.classList.add('lived-unexpected');
            }
        }

        const cellDate = new Date(birthDate);
        cellDate.setDate(1); // Force to the 1st to prevent rollover
        cellDate.setMonth(birthDate.getMonth() + m);
        const label = cellDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        cell.setAttribute('title', label);

        fragment.appendChild(cell);
    }

    // Append everything at once
    graph.appendChild(fragment);

    const legend = document.getElementById('legend');
    document.querySelector('#legend .cell.lived-unexpected').closest('li').classList.toggle('hidden', monthsDelta >= 0);
    document.querySelector('#legend .cell.unlived-expected').closest('li').classList.toggle('hidden', monthsDelta <= 0);
    legend.classList.remove('hidden');

    const endDate = new Date(birthDate);
    endDate.setFullYear(birthDate.getFullYear() + lifeExpectancy);

    const daysDelta = Math.round((endDate - currentDate) / (1000 * 60 * 60 * 24));

    // Localize the number formatting based on the user's region
    const formattedDays = Math.abs(daysDelta).toLocaleString();

    const info = document.getElementById('info');
    const punchlinePanel = document.getElementById('punchline-panel');
    const punchline = document.getElementById('punchline');
    const shareContainer = document.getElementById('share-container');

    // Hide elements instantly in case the user clicked Generate multiple times
    info.innerHTML = '';
    punchlinePanel.classList.add('hidden');
    shareContainer.classList.add('hidden');
    document.title = 'Dying Me'; // Reset the tab title during rebuild

    // Calculate when the cascade finishes (max 2500ms delay + 400ms animation)
    const cascadeDuration = 2900;

    // Step 1: Reveal the exact numbers and share button after the graph finishes
    setTimeout(() => {
        if (daysDelta >= 0) {
            info.innerHTML = `You have <strong>${formattedDays}</strong> days left assuming a lifespan of ${lifeExpectancy} years.`;
            punchline.textContent = `There really is no time to waste`;
        } else {
            info.innerHTML = `You have lived <strong>${formattedDays}</strong> days beyond the expected ${lifeExpectancy} years.`;
            punchline.textContent = `Every day you break new ground`;
        }
        shareContainer.classList.remove('hidden');
    }, cascadeDuration);

    // Step 2: Add a dramatic 800ms pause before hitting them with the giant text & updating the tab
    setTimeout(() => {
        punchlinePanel.classList.remove('hidden');

        // Update the browser tab to show their remaining days
        document.title = daysDelta >= 0 ? `${formattedDays} Days Left` : `${formattedDays} Days Outlived`;
    }, cascadeDuration + 800);
}

document.addEventListener('DOMContentLoaded', () => {
    // Check the URL for parameters first
    const params = new URLSearchParams(window.location.search);

    // Prefer URL parameters; if none, fall back to localStorage
    const birthDate = params.get('birth') || localStorage.getItem('birthDate');
    const lifeExpectancy = params.get('exp') || localStorage.getItem('lifeExpectancy');

    if (birthDate) {
        document.getElementById('birth-date').value = birthDate;
    }

    document.getElementById('life-expectancy').value = lifeExpectancy || 96;

    document.getElementById('base').addEventListener('submit', generateLifeGraph);

    // Auto-render Fix: Automatically build the graph if a saved date exists
    if (birthDate) {
        generateLifeGraph();
    }

    // Copy Link Functionality
    document.getElementById('copy-link-btn').addEventListener('click', async () => {
        try {
            // Grab the current URL (which includes the updated query parameters)
            await navigator.clipboard.writeText(window.location.href);

            // Flash the success message
            const copyMsg = document.getElementById('copy-msg');
            copyMsg.style.opacity = '1';
            setTimeout(() => {
                copyMsg.style.opacity = '0';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy link. You can manually copy the URL from your address bar.');
        }
    });
});