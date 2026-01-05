// ===== PRESENTATION DATA =====
const slides = [
    {
        text: "Virtual Twin of the Supply Chain\n\nIts role is simple:",
        media: null
    },
    {
        text: "To anticipate, prepare, and secure physical flows, with the main goal of increasing margin and increasing fulfillment, while minimizing sustainable impact through emitted CO2 Emissions.\n\nThe virtual twin mirrors the entire supply chain ecosystem:\nsuppliers, their capacities, inventories, real lead times, contractual commitments, logistics routes, and even geopolitical risks.",
        media: "SUP 1"
    },
    {
        text: "The result?\nOXOS ensures the right materials arrive at the right time, in the right place.\n\nBut more importantly, this virtual twin is generative.\nBy which we mean that our AI engine is generating new optimized scenarios at every moment.",
        media: "SUP 2"
    },
    {
        text: "It automatically simulates alternative scenarios, proposes Plan B, C, or D, recalculates risks, costs, and lead times, and continuously integrates real-world disruptions.\n\nHere's a concrete example:\na key aerospace & defense supplier announces that they will stop doing business with us in 2 months due to commercial priorities.\n\nNormally, resolving this major challenge would take the team weeks of time to investigate alternatives and calculate the impact.",
        media: "SUP 3"
    },
    {
        text: "However now, with the generative virtual twin of the supply chain we find the solution within minutes!\n\nA new sourcing scenario is generated,\nthe impact on production orders and customer deliveries is recalculated, alternative suppliers are evaluated, and the best cost–risk tradeoff is proposed.\n\nWith OXOS, we ensure we are a reliable partner to deliver to the demanding A&D customers on time.",
        media: "SUP 4"
    },
    {
        text: "- even in an unstable world.",
        media: "SUP Content"
    }
];

// ===== SUPABASE STATE =====
let supabaseClient = null;
let realtimeChannel = null;
let sessionId = null;
let isLocalAction = false; // Flag to prevent update loops

// ===== STATE MANAGEMENT =====
let currentSlide = -1; // Start at -1 to show intro
let activeMedia = null; // Track currently visible media

// ===== SDK INTEGRATION =====
// Function to send visibility messages to the SDK platform
function toggleVisibility(actorName, visible) {
    console.log("toggleVisibility:", actorName, visible);
    window.parent.postMessage(JSON.stringify({
        action: "toggleVisibility",
        actor: actorName,
        visible: visible
    }), "*");
}

// Function to show 3D media
function showMedia(mediaName) {
    if (mediaName) {
        toggleVisibility(mediaName, true);
        activeMedia = mediaName;
        console.log(`Showing 3D object: ${mediaName}`);
    }
}

// Function to hide 3D media
function hideMedia(mediaName) {
    if (mediaName) {
        toggleVisibility(mediaName, false);
        console.log(`Hiding 3D object: ${mediaName}`);
    }
}

// Function to hide all media
function hideAllMedia() {
    const allMedia = ["SUP 1", "SUP 2", "SUP 3", "SUP 4", "SUP Content"];
    allMedia.forEach(media => {
        toggleVisibility(media, false);
    });
    activeMedia = null;
    console.log("All 3D objects hidden");
}

// Function to hide AS IS Supply Chain only when presentation starts
function hideASISSupplyChain() {
    toggleVisibility("AS IS Supply Chain", false);
    console.log("AS IS Supply Chain hidden");
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initStars();
    initPresentation();
    initSupabase();

    console.log("Supply Chain Presentation (Collab) loaded - SDK ready");
});

// ===== STARS CREATION =====
function initStars() {
    const starsContainer = document.getElementById('stars');
    const starCount = 150;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        const size = Math.random() * 2 + 0.5;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        star.style.animationDuration = (Math.random() * 2 + 2) + 's';

        starsContainer.appendChild(star);
    }
}

// ===== SUPABASE SETUP =====
async function initSupabase() {
    try {
        // Initialize Supabase client
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );

        console.log('Supabase client initialized');

        // Get or create session
        const { data, error } = await supabaseClient
            .from('supply_chain_presentation_session')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching session:', error);
            return;
        }

        sessionId = data.id;
        console.log('Connected to session:', sessionId);

        // Subscribe to real-time updates
        realtimeChannel = supabaseClient
            .channel('supply_chain_presentation_session_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'supply_chain_presentation_session'
                },
                handleSessionUpdate
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        console.log('Supply Chain Real-time subscription active');

        // Don't auto-sync when first joining - user must be present from the start
        // If presentation is already in progress, new users will see the intro screen
        // and only sync when they see real-time updates (someone clicks Next)
        console.log('Current session state:', data.current_slide);
        if (data.current_slide > -1) {
            console.log('Presentation already in progress - waiting for real-time updates');
        }

    } catch (err) {
        console.error('Supabase initialization error:', err);
    }
}

// ===== SUPABASE UPDATE FUNCTIONS =====
async function updateSession(updates) {
    if (!supabaseClient || !sessionId) return;

    try {
        const { error } = await supabaseClient
            .from('supply_chain_presentation_session')
            .update(updates)
            .eq('id', sessionId);

        if (error) {
            console.error('Error updating session:', error);
        } else {
            console.log('Session updated:', updates);
        }
    } catch (err) {
        console.error('Update error:', err);
    }
}

function handleSessionUpdate(payload) {
    console.log('Received update:', payload);

    if (isLocalAction) {
        console.log('Ignoring own update');
        return;
    }

    const newSlide = payload.new.current_slide;
    console.log('Syncing to slide:', newSlide);

    syncToSlide(newSlide);
}

function syncToSlide(targetSlide) {
    // Set flag to prevent loop
    isLocalAction = true;

    // Only sync if moving forward by 1 (normal progression)
    // or going back to -1 (restart)
    const diff = targetSlide - currentSlide;

    if (diff === 1) {
        // Normal next slide progression
        nextSlideLocal();
    } else if (targetSlide === -1 && currentSlide !== -1) {
        // Restart to beginning
        restartPresentationLocal();
    }
    // Ignore other cases - user wasn't present from the start

    // Reset flag
    isLocalAction = false;
}

// ===== PRESENTATION LOGIC =====
function initPresentation() {
    const nextBtn = document.getElementById('nextBtn');
    const textContent = document.getElementById('textContent');

    // Hide all SUP media at start (but NOT AS IS Supply Chain yet)
    hideAllMedia();

    // Show intro state
    setTimeout(() => {
        textContent.classList.add('show');
        nextBtn.classList.add('show');
    }, 300);

    // Next button click handler
    nextBtn.addEventListener('click', nextSlide);

    // Update progress
    updateProgress();
}

async function nextSlide() {
    // Don't hide previous media - keep them visible!
    // Each new media adds to the scene

    // Move to next slide
    currentSlide++;

    // Update Supabase to sync with all clients
    if (!isLocalAction) {
        await updateSession({ current_slide: currentSlide });
    }

    nextSlideLocal();
}

function nextSlideLocal() {
    const textContent = document.getElementById('textContent');
    const slideText = textContent.querySelector('.slide-text');
    const nextBtn = document.getElementById('nextBtn');

    // Check if presentation is complete
    if (currentSlide >= slides.length) {
        // End of presentation
        showEndScreen();
        return;
    }

    // Animate out current text
    textContent.classList.remove('show');
    textContent.classList.add('slide-out');

    setTimeout(() => {
        // Update text content
        const slide = slides[currentSlide];
        slideText.textContent = slide.text;

        // Show new media if present (without hiding previous ones)
        if (slide.media) {
            showMedia(slide.media);

            // Hide AS IS Supply Chain when showing SUP Content (last media)
            if (slide.media === "SUP Content") {
                hideASISSupplyChain();
            }
        }

        // Animate in new text
        textContent.classList.remove('slide-out');
        textContent.classList.add('slide-in');

        setTimeout(() => {
            textContent.classList.remove('slide-in');
            textContent.classList.add('show');
        }, 100);

        // Update button text
        if (currentSlide === slides.length - 1) {
            nextBtn.querySelector('.btn-text').textContent = 'Finish';
        } else {
            nextBtn.querySelector('.btn-text').textContent = 'Continue';
        }

        // Update progress
        updateProgress();
    }, 500);
}

function showEndScreen() {
    const textContent = document.getElementById('textContent');
    const slideText = textContent.querySelector('.slide-text');
    const nextBtn = document.getElementById('nextBtn');

    // Animate out
    textContent.classList.remove('show');
    nextBtn.classList.remove('show');

    setTimeout(() => {
        slideText.innerHTML = '<strong>Thank you</strong><br>Presentation Complete';

        textContent.classList.add('show');

        // Change button to restart
        nextBtn.querySelector('.btn-text').textContent = 'Restart Presentation';
        nextBtn.querySelector('.btn-icon').textContent = '↻';
        nextBtn.onclick = restartPresentation;

        setTimeout(() => {
            nextBtn.classList.add('show');
        }, 500);
    }, 600);
}

async function restartPresentation() {
    // Update Supabase to sync with all clients
    if (!isLocalAction) {
        await updateSession({ current_slide: -1 });
    }
    restartPresentationLocal();
}

function restartPresentationLocal() {
    // Hide all media
    hideAllMedia();

    // Show AS IS Supply Chain again when restarting
    toggleVisibility("AS IS Supply Chain", true);

    // Reset state
    currentSlide = -1;

    // Reset button
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.querySelector('.btn-text').textContent = 'Start Presentation';
    nextBtn.querySelector('.btn-icon').textContent = '→';
    nextBtn.onclick = nextSlide;

    // Reset content
    const textContent = document.getElementById('textContent');
    const slideText = textContent.querySelector('.slide-text');
    slideText.textContent = '';

    // Update progress
    updateProgress();

    console.log("Presentation restarted");
}

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    const total = slides.length;
    const current = Math.max(0, currentSlide + 1);
    const percentage = (current / total) * 100;

    // Simpler approach - directly set width via inline style
    const barFill = document.createElement('div');
    barFill.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${percentage}%;
        background: linear-gradient(90deg, #1976d2, #4da6ff);
        border-radius: 10px;
        transition: width 0.6s ease;
        box-shadow: 0 0 10px rgba(77, 166, 255, 0.8);
    `;

    // Clear and add new fill
    progressBar.innerHTML = '';
    progressBar.appendChild(barFill);

    // Update text
    progressText.textContent = `${current} / ${total}`;
}
