
        const player = new Audio();
        let fullSurahAudio = [];
        let currentAyahs = [];
        let currentIndex = 0;
        let isPlaying = false;
        const ayahsPerPage = 10;

        // Load all surahs
        fetch('https://api.alquran.cloud/v1/surah')
            .then(res => res.json())
            .then(data => {
                const select = document.getElementById('surahSelect');
                select.innerHTML = '';
                data.data.forEach(surah => {
                    const opt = document.createElement('option');
                    opt.value = surah.number;
                    opt.text = `${surah.number}. ${surah.englishName} (${surah.name})`;
                    select.appendChild(opt);
                });
            });

        function loadSurah(page = 1) {
            const surahNum = document.getElementById('surahSelect').value;
            const arabicURL = `https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`;
            const urduURL = `https://api.alquran.cloud/v1/surah/${surahNum}/ur.jalandhry`;
            const audioURL = `https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`;
            const output = document.getElementById('output');
            output.innerHTML = `<p class="text-info">⏳ Loading Surah...</p>`;
            fullSurahAudio = [];
            currentAyahs = [];
            currentIndex = 0; // Reset index when loading new surah
            isPlaying = false;

            Promise.all([
                fetch(arabicURL).then(res => res.json()),
                fetch(urduURL).then(res => res.json()),
                fetch(audioURL).then(res => res.json())
            ])
                .then(([ar, ur, audio]) => {
                    const ayahsAr = ar.data.ayahs;
                    const ayahsUr = ur.data.ayahs;
                    const ayahsAudio = audio.data.ayahs;
                    const surahName = ar.data.englishName;
                    const surahArabic = ar.data.name;

                    currentAyahs = ayahsAr.map((ayah, i) => ({
                        arabic: ayah.text,
                        urdu: ayahsUr[i]?.text || '',
                        audio: ayahsAudio[i]?.audio || '',
                        number: ayah.numberInSurah
                    }));

                    fullSurahAudio = ayahsAudio.map(a => a.audio);
                    renderPage(page, surahName, surahArabic);
                })
                .catch(err => {
                    console.error(err);
                    output.innerHTML = `<p class="text-danger">❌ Failed to load Surah or translation.</p>`;
                });
        }

        function renderPage(page, surahName, surahArabic) {
            const output = document.getElementById('output');
            output.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="text-primary">${surahName} - ${surahArabic}</h3>
                    <div>
                        <button class="btn btn-success" onclick="playFullSurah()">🎧 Listen Full Surah</button>
                        <button class="btn btn-danger ms-2" onclick="stopAudio()">⏹️ Stop</button>
                    </div>
                </div>
            `;

            const start = (page - 1) * ayahsPerPage;
            const end = start + ayahsPerPage;
            const paginatedAyahs = currentAyahs.slice(start, end);

            paginatedAyahs.forEach((ayah, i) => {
                const card = `
                    <div class="col-md-10">
                        <div class="card ayah-card p-3" id="ayah-${ayah.number}">
                            <div class="card-body">
                                <p class="ayah-arabic" id="text-${ayah.number}">${ayah.number}. ${ayah.arabic}</p>
                                <p class="ayah-urdu">${ayah.urdu}</p>
                                <button class="btn btn-outline-primary audio-btn" onclick="playAudio('${ayah.audio}', ${ayah.number})">🔊 Listen</button>
                            </div>
                        </div>
                    </div>
                `;
                output.innerHTML += card;
            });

            renderPagination(page, Math.ceil(currentAyahs.length / ayahsPerPage));
        }

        function renderPagination(currentPage, totalPages) {
            const pagination = document.getElementById('pagination');
            pagination.innerHTML = '';

            for (let i = 1; i <= totalPages; i++) {
                const li = document.createElement('li');
                li.className = `page-item ${i === currentPage ? 'active' : ''}`;
                li.innerHTML = `<a class="page-link" href="#" onclick="loadSurah(${i}); return false;">${i}</a>`;
                pagination.appendChild(li);
            }
        }

        function playAudio(url, ayahNumber) {
            player.pause();
            player.src = url;
            player.play();
            isPlaying = true;

            // Remove previous highlights
            document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

            // Highlight the current ayah
            const ayahText = document.getElementById(`text-${ayahNumber}`);
            if (ayahText) ayahText.classList.add('highlight');

            // Auto-scroll to the ayah
            const ayahCard = document.getElementById(`ayah-${ayahNumber}`);
            if (ayahCard) ayahCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function stopAudio() {
            if (isPlaying) {
                player.pause();
                isPlaying = false;
            }
        }

        function playFullSurah() {
            if (fullSurahAudio.length === 0) return;

            const startPage = Math.ceil((currentIndex + 1) / ayahsPerPage);
            renderPage(startPage, document.querySelector('.text-primary').textContent.split(' - ')[0], document.querySelector('.text-primary').textContent.split(' - ')[1]);

            function playNext() {
                if (currentIndex >= fullSurahAudio.length) {
                    isPlaying = false;
                    currentIndex = 0;
                    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
                    return;
                }

                const ayahNumber = currentAyahs[currentIndex].number;
                const page = Math.ceil(ayahNumber / ayahsPerPage);

                // Load the correct page if needed
                if (page !== Math.ceil((currentIndex + 1) / ayahsPerPage)) {
                    renderPage(page, document.querySelector('.text-primary').textContent.split(' - ')[0], document.querySelector('.text-primary').textContent.split(' - ')[1]);
                }

                playAudio(fullSurahAudio[currentIndex], ayahNumber);

                player.onended = function () {
                    currentIndex++;
                    playNext();
                };
            }

            if (!isPlaying) {
                isPlaying = true;
                playNext();
            }
        }
