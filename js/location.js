/**
 * Philippines delivery locations via the public PSGC API.
 */
(function () {
  "use strict";

  var API_BASE = "https://psgc.gitlab.io/api";

  var regionSelect = document.getElementById("deliveryRegion");
  var provinceSelect = document.getElementById("deliveryProvince");
  var citySelect = document.getElementById("deliveryCity");
  var barangaySelect = document.getElementById("deliveryBarangay");
  var provinceGroup = document.getElementById("deliveryProvinceGroup");
  var streetInput = document.getElementById("customerStreet");

  var skipProvince = false;

  function fetchJson(path) {
    return fetch(API_BASE + path).then(function (response) {
      if (!response.ok) {
        throw new Error("Location request failed.");
      }
      return response.json();
    });
  }

  function sortByName(items) {
    return items.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
  }

  function resetSelect(select, placeholder, disabled) {
    if (!select) return;
    select.innerHTML = "";
    var option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.appendChild(option);
    select.disabled = !!disabled;
    select.value = "";
  }

  function fillSelect(select, items, placeholder) {
    if (!select) return;
    resetSelect(select, placeholder, false);
    sortByName(items).forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.code;
      option.textContent = item.name;
      select.appendChild(option);
    });
  }

  function setProvinceMode(ncrMode) {
    skipProvince = ncrMode;
    if (!provinceSelect || !provinceGroup) return;

    if (ncrMode) {
      provinceGroup.classList.add("hidden");
      provinceSelect.disabled = true;
      provinceSelect.removeAttribute("required");
      resetSelect(provinceSelect, "Not applicable", true);
    } else {
      provinceGroup.classList.remove("hidden");
      provinceSelect.disabled = true;
      provinceSelect.setAttribute("required", "required");
      resetSelect(provinceSelect, "Select province", true);
    }
  }

  function loadRegions() {
    if (!regionSelect) return Promise.resolve();
    regionSelect.disabled = true;
    return fetchJson("/regions/")
      .then(function (regions) {
        fillSelect(regionSelect, regions, "Select region");
        regionSelect.disabled = false;
      })
      .catch(function () {
        resetSelect(regionSelect, "Unable to load regions", true);
      });
  }

  function loadProvinces(regionCode) {
    setProvinceMode(false);
    resetSelect(citySelect, "Select city or municipality", true);
    resetSelect(barangaySelect, "Select barangay", true);

    return fetchJson("/regions/" + regionCode + "/provinces/").then(function (provinces) {
      if (!provinces.length) {
        setProvinceMode(true);
        return loadCitiesFromRegion(regionCode);
      }

      fillSelect(provinceSelect, provinces, "Select province");
      provinceSelect.disabled = false;
    });
  }

  function loadCitiesFromRegion(regionCode) {
    resetSelect(citySelect, "Select city or municipality", true);
    resetSelect(barangaySelect, "Select barangay", true);

    return fetchJson("/regions/" + regionCode + "/cities-municipalities/").then(function (cities) {
      fillSelect(citySelect, cities, "Select city or municipality");
    });
  }

  function loadCitiesFromProvince(provinceCode) {
    resetSelect(citySelect, "Select city or municipality", true);
    resetSelect(barangaySelect, "Select barangay", true);

    return fetchJson("/provinces/" + provinceCode + "/cities-municipalities/").then(function (cities) {
      fillSelect(citySelect, cities, "Select city or municipality");
    });
  }

  function loadBarangays(cityCode) {
    resetSelect(barangaySelect, "Select barangay", true);
    return fetchJson("/cities-municipalities/" + cityCode + "/barangays/").then(function (barangays) {
      fillSelect(barangaySelect, barangays, "Select barangay");
    });
  }

  function getSelectedLabel(select) {
    if (!select || !select.value) return "";
    var option = select.options[select.selectedIndex];
    return option ? option.textContent : "";
  }

  function getFormattedAddress() {
    var parts = [];
    var street = streetInput ? streetInput.value.trim() : "";
    var barangay = getSelectedLabel(barangaySelect);
    var city = getSelectedLabel(citySelect);
    var province = skipProvince ? "" : getSelectedLabel(provinceSelect);
    var region = getSelectedLabel(regionSelect);

    if (street) parts.push(street);
    if (barangay) parts.push(barangay);
    if (city) parts.push(city);
    if (province) parts.push(province);
    if (region) parts.push(region);

    return parts.join(", ");
  }

  function resetLocationForm() {
    if (regionSelect) regionSelect.value = "";
    setProvinceMode(false);
    resetSelect(provinceSelect, "Select province", true);
    resetSelect(citySelect, "Select city or municipality", true);
    resetSelect(barangaySelect, "Select barangay", true);
    if (streetInput) streetInput.value = "";
  }

  function bindEvents() {
    if (regionSelect) {
      regionSelect.addEventListener("change", function () {
        var regionCode = regionSelect.value;
        if (!regionCode) {
          setProvinceMode(false);
          resetSelect(provinceSelect, "Select province", true);
          resetSelect(citySelect, "Select city or municipality", true);
          resetSelect(barangaySelect, "Select barangay", true);
          return;
        }
        loadProvinces(regionCode);
      });
    }

    if (provinceSelect) {
      provinceSelect.addEventListener("change", function () {
        var provinceCode = provinceSelect.value;
        if (!provinceCode) {
          resetSelect(citySelect, "Select city or municipality", true);
          resetSelect(barangaySelect, "Select barangay", true);
          return;
        }
        loadCitiesFromProvince(provinceCode);
      });
    }

    if (citySelect) {
      citySelect.addEventListener("change", function () {
        var cityCode = citySelect.value;
        if (!cityCode) {
          resetSelect(barangaySelect, "Select barangay", true);
          return;
        }
        loadBarangays(cityCode);
      });
    }
  }

  window.EcoWeaveLocation = {
    getFormattedAddress: getFormattedAddress,
    resetLocationForm: resetLocationForm
  };

  bindEvents();
  loadRegions();
})();
