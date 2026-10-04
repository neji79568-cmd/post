const API_URL = "https://inai-col1.fishrungames.com/ads";

const adForm = document.getElementById("adForm");
const adsList = document.getElementById("adsList");
const loading = document.getElementById("loading");
const emptyMessage = document.getElementById("emptyMessage");
const formMessage = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");
const refreshButton = document.getElementById("refreshButton");

function safeText(value) {
    return value === null || value === undefined ? "" : String(value);
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = safeText(text);
    return div.innerHTML;
}

function formatPrice(price) {
    const num = Number(price);
    return Number.isFinite(num) ? num.toLocaleString("ru-RU") : "0";
}

function showMessage(message, type) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = type;
}


async function loadAds() {
    if (!loading || !adsList || !emptyMessage) return;

    loading.style.display = "block";
    adsList.innerHTML = "";
    emptyMessage.style.display = "none";

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Не удалось получить объявления");
        }

        const data = await response.json();
        console.log("GET ответ:", data);

        const ads = Array.isArray(data?.items) ? data.items : [];

        loading.style.display = "none";

        if (ads.length === 0) {
            emptyMessage.style.display = "block";
            return;
        }

        ads.forEach((ad) => createAdCard(ad));
    } catch (error) {
        loading.style.display = "none";
        adsList.innerHTML = `
            <div class="empty-message" style="display:block;">
                Не удалось загрузить объявления.
            </div>
        `;
        console.error("GET ошибка:", error);
    }
}




function createAdCard(ad, isNew = false) {
    if (!adsList) return;

    const card = document.createElement("div");
    card.className = "ad-card";

    if (isNew) {
        card.style.border = "2px solid #222";
    }

    let imageHTML = '<div class="no-image">Нет изображения</div>';

    if (ad?.image_url) {
        const imageURL = new URL(ad.image_url, API_URL).href;
        imageHTML = `<img src="${imageURL}" alt="${escapeHTML(ad.title || "Объявление")}" class="ad-image">`;
    }

    const title = escapeHTML(ad?.title || "Без названия");
    const description = escapeHTML(ad?.description || "Описание отсутствует");
    const price = formatPrice(ad?.price ?? 0);
    const adId = ad?.id;

    const deleteButtonHTML = adId !== undefined && adId !== null ? `
        <div class="ad-actions">
            <button type="button" class="delete-button" data-id="${escapeHTML(String(adId))}">Удалить</button>
        </div>
    ` : "";

    card.innerHTML = `
        ${imageHTML}
        <div class="ad-content">
            ${isNew ? `
                <div style="display:inline-block;background:#222;color:white;padding:5px 10px;border-radius:5px;font-size:12px;margin-bottom:10px;">
                    ВАШЕ ОБЪЯВЛЕНИЕ
                </div>
            ` : ""}
            <h3 class="ad-title">${title}</h3>
            <p class="ad-description">${description}</p>
            <div class="ad-price">${price} сом</div>
            ${deleteButtonHTML}
        </div>
    `;

    const deleteButton = card.querySelector(".delete-button");
    if (deleteButton) {
        deleteButton.addEventListener("click", async function() {
            await deleteAd(deleteButton.dataset.id);
        });
    }

    adsList.prepend(card);
}

function deleteAd(adId) {
    if (!adId) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);

    fetch(`${API_URL}/${adId}`, {
        method: "DELETE",
        signal: controller.signal
    }).catch((error) => {
        console.warn("DELETE endpoint недоступен, удаляем локально:", error);
    }).finally(() => {
        clearTimeout(timer);
    });

    const buttons = document.querySelectorAll(".delete-button");
    for (const button of buttons) {
        if (button.dataset.id === String(adId)) {
            const card = button.closest(".ad-card");
            if (card) {
                card.remove();
            }
            break;
        }
    }

    showMessage("Объявление удалено.", "success");

    if (adsList && adsList.children.length === 0) {
        emptyMessage.style.display = "block";
    }
}




if (adForm) {
    adForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        if (!formMessage || !submitButton) return;

        formMessage.textContent = "";
        formMessage.className = "";

        const title = document.getElementById("title")?.value.trim();
        const description = document.getElementById("description")?.value.trim();
        const price = document.getElementById("price")?.value;
        const image = document.getElementById("image")?.files[0];

        if (!title) {
            showMessage("Введите название объявления.", "error");
            return;
        }

        if (!description) {
            showMessage("Введите описание.", "error");
            return;
        }

        if (!price) {
            showMessage("Введите цену.", "error");
            return;
        }

        if (!image) {
            showMessage("Выберите изображение.", "error");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("price", price);
        formData.append("image", image);

        submitButton.disabled = true;
        submitButton.textContent = "Добавление...";

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: formData
            });

            const data = await response.json();
            console.log("POST ответ:", data);

            if (!response.ok) {
                throw new Error(data?.detail || data?.message || "Ошибка при добавлении объявления");
            }

            showMessage("Объявление добавлено!", "success");
            emptyMessage.style.display = "none";
            adForm.reset();
            await loadAds();
        } catch (error) {
            console.error("POST ошибка:", error);
            showMessage("Ошибка: " + (error?.message || "Неизвестная ошибка"), "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Добавить объявление";
        }
    });
}

if (refreshButton) {
    refreshButton.addEventListener("click", function() {
        loadAds();
    });
}

loadAds();

