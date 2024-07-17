// ==UserScript==
// @name            AWA Giveaway Key Checker
// @description     Show available key amount, tier requirement and restrictions to certain countries.
// @namespace       AWAKeyChecker
// @version         2.0
// @author          amoAR
// @license         GPL-3.0 (https://github.com/amoAR/AWA-Key-Checker/raw/main/LICENSE)
// @icon            https://media.alienwarearena.com/images/favicons/favicon-32x32.png
// @homepageURL     https://github.com/amoAR/AWA-Key-Checker
// @supportURL      https://github.com/amoAR/AWA-Key-Checker/issues
// @updateURL       https://github.com/amoAR/AWA-Key-Checker/raw/main/AWACheck.user.js
// @downloadURL     https://github.com/amoAR/AWA-Key-Checker/raw/main/AWACheck.user.js
// @match           https://*.alienwarearena.com/ucf*
// @exclude         https://*.alienwarearena.com/ucf/increment*
// @require         https://openuserjs.org/src/libs/sizzle/GM_config.js
// @run-at          document-idle
// @grant           GM.getValue
// @grant           GM.setValue
// @grant           GM_registerMenuCommand
// @compatible      Firefox
// ==/UserScript==

const namespace = "AWAKeyChecker:";
const timeout = 5;

// configuration callbacks
function Callbacks() {
  let hasRun = false;
  let runables = [];
  let next = () => runables.shift();
  let run = function () {
    hasRun = true;
    for (let fn = next(); !!fn; fn = next())
      setTimeout(fn);
  };
  run.add = fn => {
    runables.push(fn);
    if (hasRun) run();
  };
  return run;
}
let onInit = new Callbacks();

// Initialize the configuration
let frame = document.createElement('div');
document.body.appendChild(frame);

const styles = `
  #configuration {
    height: auto !important;
    width: auto !important;
    padding: 20px !important;
    max-height: 600px !important;
    max-width: 600px !important;
    border: 3px solid #fff !important;
    background-color: rgba(56, 61, 81, .95);
    color: #fff;
  }

  #configuration .field_label {
    margin-bottom: 0;
    font-size: medium;
  }

  #configuration .config_header {
    font-size: 17pt;
    font-weight: bold;
  }

  #configuration .config_var {
    margin-top: 10px;
    display: flex;
  }

  #configuration_buttons_holder {
    text-align: center;
  }

  #configuration #configuration_resetLink {
    color: #fff;
  }

  .config_var input[type="checkbox"] {
    order: -1;
    margin: 0 10px 0 0;
    font-size: medium;
  }

  #configuration #configuration_items_to_hide_var {
    display: block;
  }

  #configuration_field_items_to_hide {
    height: 150px;
    width: 100%;
    resize: none;
    background-color: rgba(56, 61, 81, .95);
    color: #fff;
  }

  #configuration_interval_var::before {
    content: "Waiting interval for loading in ms \\A (Depends on network speed)";
    text-align: left;
    white-space: pre;
    font-size: medium;
    font-weight: bold;
  }
    
  #configuration_interval_var {
    text-align: center;
  }
`
const gmc = new GM_config(
  {
    'id': 'configuration',
    'title': 'AWAKeyChecker Configs',
    'fields':
    {
      'rgb_enabled':
      {
        'label': 'Enable RGB effects',
        'type': 'checkbox',
        'default': false
      },
      'interval':
      {
        'lable': 'Waiting interval for loading in ms (Depends on network speed)',
        'type': 'unsigned int',
        'min': 1000,
        'max': 5000,
        'default': 1000
      }
    },
    'events': {
      'init': onInit,
      'save': () => { location.reload() }
    },
    'frame': frame,
    'css': styles.replace(/&lt;br&gt;/g, '').replace(/\s\s+/g, ' ').trim()
  }
);

// Key checker
function check_keys(rgb_enabled) {
  var country_with_keys = [];
  var country_without_keys = [];
  var countries = new function () {
    var list = [
      {
        code: "AF",
        name: "Afghanistan"
      },
      {
        code: "AX",
        name: "Aland Islands"
      },
      {
        code: "AL",
        name: "Albania"
      },
      {
        code: "DZ",
        name: "Algeria"
      },
      {
        code: "AS",
        name: "American Samoa"
      },
      {
        code: "AD",
        name: "Andorra"
      },
      {
        code: "AO",
        name: "Angola"
      },
      {
        code: "AI",
        name: "Anguilla"
      },
      {
        code: "AQ",
        name: "Antarctica"
      },
      {
        code: "AG",
        name: "Antigua and Barbuda"
      },
      {
        code: "AR",
        name: "Argentina"
      },
      {
        code: "AM",
        name: "Armenia"
      },
      {
        code: "AW",
        name: "Aruba"
      },
      {
        code: "AU",
        name: "Australia"
      },
      {
        code: "AT",
        name: "Austria"
      },
      {
        code: "AZ",
        name: "Azerbaijan"
      },
      {
        code: "BS",
        name: "Bahamas"
      },
      {
        code: "BH",
        name: "Bahrain"
      },
      {
        code: "BD",
        name: "Bangladesh"
      },
      {
        code: "BB",
        name: "Barbados"
      },
      {
        code: "BY",
        name: "Belarus"
      },
      {
        code: "BE",
        name: "Belgium"
      },
      {
        code: "BZ",
        name: "Belize"
      },
      {
        code: "BJ",
        name: "Benin"
      },
      {
        code: "BM",
        name: "Bermuda"
      },
      {
        code: "BT",
        name: "Bhutan"
      },
      {
        code: "BO",
        name: "Bolivia"
      },
      {
        code: "BQ",
        name: "Bonaire, Sint Eustatius and Saba"
      },
      {
        code: "BA",
        name: "Bosnia and Herzegovina"
      },
      {
        code: "BW",
        name: "Botswana"
      },
      {
        code: "BV",
        name: "Bouvet Island"
      },
      {
        code: "BR",
        name: "Brazil"
      },
      {
        code: "IO",
        name: "British Indian Ocean Territory"
      },
      {
        code: "BN",
        name: "Brunei Darussalam"
      },
      {
        code: "BG",
        name: "Bulgaria"
      },
      {
        code: "BF",
        name: "Burkina Faso"
      },
      {
        code: "BI",
        name: "Burundi"
      },
      {
        code: "CV",
        name: "Cabo Verde"
      },
      {
        code: "KH",
        name: "Cambodia"
      },
      {
        code: "CM",
        name: "Cameroon"
      },
      {
        code: "CA",
        name: "Canada"
      },
      {
        code: "KY",
        name: "Cayman Islands"
      },
      {
        code: "CF",
        name: "Central African Republic"
      },
      {
        code: "TD",
        name: "Chad"
      },
      {
        code: "CL",
        name: "Chile"
      },
      {
        code: "CN",
        name: "China"
      },
      {
        code: "CX",
        name: "Christmas Island"
      },
      {
        code: "CC",
        name: "Cocos (Keeling) Islands"
      },
      {
        code: "CO",
        name: "Colombia"
      },
      {
        code: "KM",
        name: "Comoros"
      },
      {
        code: "CG",
        name: "Congo"
      },
      {
        code: "CD",
        name: "Congo"
      },
      {
        code: "CK",
        name: "Cook Islands"
      },
      {
        code: "CR",
        name: "Costa Rica"
      },
      {
        code: "CI",
        name: 'Côte d"Ivoire'
      },
      {
        code: "HR",
        name: "Croatia"
      },
      {
        code: "CU",
        name: "Cuba"
      },
      {
        code: "CW",
        name: "Curaçao"
      },
      {
        code: "CY",
        name: "Cyprus"
      },
      {
        code: "CZ",
        name: "Czech Republic"
      },
      {
        code: "DK",
        name: "Denmark"
      },
      {
        code: "DJ",
        name: "Djibouti"
      },
      {
        code: "DM",
        name: "Dominica"
      },
      {
        code: "DO",
        name: "Dominican Republic"
      },
      {
        code: "EC",
        name: "Ecuador"
      },
      {
        code: "EG",
        name: "Egypt"
      },
      {
        code: "SV",
        name: "El Salvador"
      },
      {
        code: "GQ",
        name: "Equatorial Guinea"
      },
      {
        code: "ER",
        name: "Eritrea"
      },
      {
        code: "EE",
        name: "Estonia"
      },
      {
        code: "ET",
        name: "Ethiopia"
      },
      {
        code: "FK",
        name: "Falkland Islands"
      },
      {
        code: "FO",
        name: "Faroe Islands"
      },
      {
        code: "FJ",
        name: "Fiji"
      },
      {
        code: "FI",
        name: "Finland"
      },
      {
        code: "FR",
        name: "France"
      },
      {
        code: "GF",
        name: "French Guiana"
      },
      {
        code: "PF",
        name: "French Polynesia"
      },
      {
        code: "TF",
        name: "French Southern Territories"
      },
      {
        code: "GA",
        name: "Gabon"
      },
      {
        code: "GM",
        name: "Gambia"
      },
      {
        code: "GE",
        name: "Georgia"
      },
      {
        code: "DE",
        name: "Germany"
      },
      {
        code: "GH",
        name: "Ghana"
      },
      {
        code: "GI",
        name: "Gibraltar"
      },
      {
        code: "GR",
        name: "Greece"
      },
      {
        code: "GL",
        name: "Greenland"
      },
      {
        code: "GD",
        name: "Grenada"
      },
      {
        code: "GP",
        name: "Guadeloupe"
      },
      {
        code: "GU",
        name: "Guam"
      },
      {
        code: "GT",
        name: "Guatemala"
      },
      {
        code: "GG",
        name: "Guernsey"
      },
      {
        code: "GN",
        name: "Guinea"
      },
      {
        code: "GW",
        name: "Guinea-Bissau"
      },
      {
        code: "GY",
        name: "Guyana"
      },
      {
        code: "HT",
        name: "Haiti"
      },
      {
        code: "HM",
        name: "Heard Island and McDonald Islands"
      },
      {
        code: "VA",
        name: "Holy See"
      },
      {
        code: "HN",
        name: "Honduras"
      },
      {
        code: "HK",
        name: "Hong Kong"
      },
      {
        code: "HU",
        name: "Hungary"
      },
      {
        code: "IS",
        name: "Iceland"
      },
      {
        code: "IN",
        name: "India"
      },
      {
        code: "ID",
        name: "Indonesia"
      },
      {
        code: "IR",
        name: "Iran"
      },
      {
        code: "IQ",
        name: "Iraq"
      },
      {
        code: "IE",
        name: "Ireland"
      },
      {
        code: "IM",
        name: "Isle of Man"
      },
      {
        code: "IL",
        name: "Israel"
      },
      {
        code: "IT",
        name: "Italy"
      },
      {
        code: "JM",
        name: "Jamaica"
      },
      {
        code: "JP",
        name: "Japan"
      },
      {
        code: "JE",
        name: "Jersey"
      },
      {
        code: "JO",
        name: "Jordan"
      },
      {
        code: "KZ",
        name: "Kazakhstan"
      },
      {
        code: "KE",
        name: "Kenya"
      },
      {
        code: "KI",
        name: "Kiribati"
      },
      {
        code: "KP",
        name: "Korea"
      },
      {
        code: "KR",
        name: "Korea"
      },
      {
        code: "KW",
        name: "Kuwait"
      },
      {
        code: "KG",
        name: "Kyrgyzstan"
      },
      {
        code: "LA",
        name: "Lao"
      },
      {
        code: "LV",
        name: "Latvia"
      },
      {
        code: "LB",
        name: "Lebanon"
      },
      {
        code: "LS",
        name: "Lesotho"
      },
      {
        code: "LR",
        name: "Liberia"
      },
      {
        code: "LY",
        name: "Libya"
      },
      {
        code: "LI",
        name: "Liechtenstein"
      },
      {
        code: "LT",
        name: "Lithuania"
      },
      {
        code: "LU",
        name: "Luxembourg"
      },
      {
        code: "MO",
        name: "Macao"
      },
      {
        code: "MK",
        name: "Macedonia"
      },
      {
        code: "MG",
        name: "Madagascar"
      },
      {
        code: "MW",
        name: "Malawi"
      },
      {
        code: "MY",
        name: "Malaysia"
      },
      {
        code: "MV",
        name: "Maldives"
      },
      {
        code: "ML",
        name: "Mali"
      },
      {
        code: "MT",
        name: "Malta"
      },
      {
        code: "MH",
        name: "Marshall Islands"
      },
      {
        code: "MQ",
        name: "Martinique"
      },
      {
        code: "MR",
        name: "Mauritania"
      },
      {
        code: "MU",
        name: "Mauritius"
      },
      {
        code: "YT",
        name: "Mayotte"
      },
      {
        code: "MX",
        name: "Mexico"
      },
      {
        code: "FM",
        name: "Micronesia"
      },
      {
        code: "MD",
        name: "Moldova"
      },
      {
        code: "MC",
        name: "Monaco"
      },
      {
        code: "MN",
        name: "Mongolia"
      },
      {
        code: "ME",
        name: "Montenegro"
      },
      {
        code: "MS",
        name: "Montserrat"
      },
      {
        code: "MA",
        name: "Morocco"
      },
      {
        code: "MZ",
        name: "Mozambique"
      },
      {
        code: "MM",
        name: "Myanmar"
      },
      {
        code: "NA",
        name: "Namibia"
      },
      {
        code: "NR",
        name: "Nauru"
      },
      {
        code: "NP",
        name: "Nepal"
      },
      {
        code: "NL",
        name: "Netherlands"
      },
      {
        code: "NC",
        name: "New Caledonia"
      },
      {
        code: "NZ",
        name: "New Zealand"
      },
      {
        code: "NI",
        name: "Nicaragua"
      },
      {
        code: "NE",
        name: "Niger"
      },
      {
        code: "NG",
        name: "Nigeria"
      },
      {
        code: "NU",
        name: "Niue"
      },
      {
        code: "NF",
        name: "Norfolk Island"
      },
      {
        code: "MP",
        name: "Northern Mariana Islands"
      },
      {
        code: "NO",
        name: "Norway"
      },
      {
        code: "OM",
        name: "Oman"
      },
      {
        code: "PK",
        name: "Pakistan"
      },
      {
        code: "PW",
        name: "Palau"
      },
      {
        code: "PS",
        name: "Palestine"
      },
      {
        code: "PA",
        name: "Panama"
      },
      {
        code: "PG",
        name: "Papua New Guinea"
      },
      {
        code: "PY",
        name: "Paraguay"
      },
      {
        code: "PE",
        name: "Peru"
      },
      {
        code: "PH",
        name: "Philippines"
      },
      {
        code: "PN",
        name: "Pitcairn"
      },
      {
        code: "PL",
        name: "Poland"
      },
      {
        code: "PT",
        name: "Portugal"
      },
      {
        code: "PR",
        name: "Puerto Rico"
      },
      {
        code: "QA",
        name: "Qatar"
      },
      {
        code: "RE",
        name: "Réunion"
      },
      {
        code: "RO",
        name: "Romania"
      },
      {
        code: "RU",
        name: "Russia"
      },
      {
        code: "RW",
        name: "Rwanda"
      },
      {
        code: "BL",
        name: "Saint Barthélemy"
      },
      {
        code: "SH",
        name: "Saint Helena, Ascension and Tristan da Cunha"
      },
      {
        code: "KN",
        name: "Saint Kitts and Nevis"
      },
      {
        code: "LC",
        name: "Saint Lucia"
      },
      {
        code: "MF",
        name: "Saint Martin"
      },
      {
        code: "PM",
        name: "Saint Pierre and Miquelon"
      },
      {
        code: "VC",
        name: "Saint Vincent and the Grenadines"
      },
      {
        code: "WS",
        name: "Samoa"
      },
      {
        code: "SM",
        name: "San Marino"
      },
      {
        code: "ST",
        name: "Sao Tome and Principe"
      },
      {
        code: "SA",
        name: "Saudi Arabia"
      },
      {
        code: "SN",
        name: "Senegal"
      },
      {
        code: "RS",
        name: "Serbia"
      },
      {
        code: "SC",
        name: "Seychelles"
      },
      {
        code: "SL",
        name: "Sierra Leone"
      },
      {
        code: "SG",
        name: "Singapore"
      },
      {
        code: "SX",
        name: "Sint Maarten"
      },
      {
        code: "SK",
        name: "Slovakia"
      },
      {
        code: "SI",
        name: "Slovenia"
      },
      {
        code: "SB",
        name: "Solomon Islands"
      },
      {
        code: "SO",
        name: "Somalia"
      },
      {
        code: "ZA",
        name: "South Africa"
      },
      {
        code: "GS",
        name: "South Georgia and the South Sandwich Islands"
      },
      {
        code: "SS",
        name: "South Sudan"
      },
      {
        code: "ES",
        name: "Spain"
      },
      {
        code: "LK",
        name: "Sri Lanka"
      },
      {
        code: "SD",
        name: "Sudan"
      },
      {
        code: "SR",
        name: "Suriname"
      },
      {
        code: "SJ",
        name: "Svalbard and Jan Mayen"
      },
      {
        code: "SZ",
        name: "Swaziland"
      },
      {
        code: "SE",
        name: "Sweden"
      },
      {
        code: "CH",
        name: "Switzerland"
      },
      {
        code: "SY",
        name: "Syrian Arab Republic"
      },
      {
        code: "TW",
        name: "Taiwan"
      },
      {
        code: "TJ",
        name: "Tajikistan"
      },
      {
        code: "TZ",
        name: "Tanzania"
      },
      {
        code: "TH",
        name: "Thailand"
      },
      {
        code: "TL",
        name: "Timor-Leste"
      },
      {
        code: "TG",
        name: "Togo"
      },
      {
        code: "TK",
        name: "Tokelau"
      },
      {
        code: "TO",
        name: "Tonga"
      },
      {
        code: "TT",
        name: "Trinidad and Tobago"
      },
      {
        code: "TN",
        name: "Tunisia"
      },
      {
        code: "TR",
        name: "Turkey"
      },
      {
        code: "TM",
        name: "Turkmenistan"
      },
      {
        code: "TC",
        name: "Turks and Caicos Islands"
      },
      {
        code: "TV",
        name: "Tuvalu"
      },
      {
        code: "UG",
        name: "Uganda"
      },
      {
        code: "UA",
        name: "Ukraine"
      },
      {
        code: "AE",
        name: "United Arab Emirates"
      },
      {
        code: "GB",
        name: "United Kingdom"
      },
      {
        code: "US",
        name: "United States of America"
      },
      {
        code: "UM",
        name: "United States Minor Outlying Islands"
      },
      {
        code: "UY",
        name: "Uruguay"
      },
      {
        code: "UZ",
        name: "Uzbekistan"
      },
      {
        code: "VU",
        name: "Vanuatu"
      },
      {
        code: "VE",
        name: "Venezuela"
      },
      {
        code: "VN",
        name: "Vietnam"
      },
      {
        code: "VG",
        name: "Virgin Islands (British)"
      },
      {
        code: "VI",
        name: "Virgin Islands (U.S.)"
      },
      {
        code: "WF",
        name: "Wallis and Futuna"
      },
      {
        code: "EH",
        name: "Western Sahara"
      },
      {
        code: "YE",
        name: "Yemen"
      },
      {
        code: "ZM",
        name: "Zambia"
      },
      {
        code: "ZW",
        name: "Zimbabwe"
      },
      {
        code: "AN",
        name: "Netherlands Antilles"
      },
      {
        code: "CS",
        name: "Serbia and Montenegro"
      },
      {
        code: "AC",
        name: "Ascension Island"
      },
      {
        code: "CP",
        name: "Clipperton Island"
      },
      {
        code: "DG",
        name: "Diego Garcia"
      },
      {
        code: "EA",
        name: "Ceuta, Melilla"
      },
      {
        code: "EU",
        name: "European Union"
      },
      {
        code: "IC",
        name: "Canary Islands"
      },
      {
        code: "TA",
        name: "Tristan da Cunha"
      },
      {
        code: "QO",
        name: "Outlying Oceania"
      }
    ];
    var codes = {};

    for (var i = 0; i < list.length; ++i) {
      var entry = list[i];
      codes[entry.code] = entry;
    }

    this.getEntry = function (code) {
      return codes[code];
    };
  }();

  for (var country in countryKeys) {
    var get_country = countries.getEntry(country);
    var get_country_name = get_country.name;
    if (countryKeys[country].length === 0) {
      country_without_keys.push(" " + get_country_name);
    } else {
      country_with_keys.push(" " + get_country_name);
    }
  }
  country_with_keys.sort();
  country_without_keys.sort();
  if (country_with_keys.length !== 0) {
    country_with_keys[0] = country_with_keys[0].split(" ").join("");
  }
  if (country_without_keys.length !== 0) {
    country_without_keys[0] = country_without_keys[0].split(" ").join("");
  }

  // Instructions article
  const rightPanel = document.querySelector('article[class*="top-widget"][class*="instructions"] h1:first-of-type');

  // Inject new CSS
  const style = document.createElement("style");
  style.innerText = `
    .js-widget-check {
      margin-bottom: 2rem;
    }

    .js-widget-check > div h5.success {
      color: green;
      font-weight: bold;
      font-size: 1.15rem;
    }
    
    .js-widget-check > div h5.danger {
      color: indianred;
      font-weight: bold;
      font-size: 1.15rem;
    }

    .js-widget-check > div h5.warning {
      color: goldenrod;
      font-weight: bold;
      font-size: 1.15rem;
    }
    
    .js-widget-check > div h5.info {
      color: darkolivegreen;
      font-weight: bold;
      font-size: 1.15rem;
    }

    .js-widget-check > div p {
      padding-top: 5px;
      color: #363636;
    }

    .js-widget-check > div ul {
      color: #363636;
    }

    .js-widget-check > div li {
      border: none !important;
      padding: 5px 0;
    }

    .js-widget-check > div:has(img) {
      text-align: center;
    }

    .js-widget-check > div img {
      margin-left: 1.5rem;
      pointer-events: none;
    }

    .js-widget-check > div hr {
      border: 0 !important;
      padding-bottom: 1.5px;
      margin-bottom: 1.5rem;
      background: hsla(0, 0%, 66%, 0.33);
    }
  `;

  // More styles for RGB effects
  if (rgb_enabled) {
    style.innerText += `
      @keyframes animate {
        100% {
          filter: hue-rotate(360deg);
        }
      }

      .js-widget-check * {
        user-select: none;
      }

      .js-widget-check {
        display: flex;
        align-content: center;
        background:linear-gradient(135deg, rgba(20, 255, 233, .7), rgba(255, 235, 59, .7), rgba(255, 0, 224, .6), rgba(0, 255, 255, 1));
        border-radius: 10px;
        animation: animate 2.3s linear infinite;
      }

      .js-widget-check > div {
        width: 100%;
        background: rgba(250, 250, 250, .7);
        backdrop-filter: blur(50px);
        border-radius: 6px;
        padding: 5%;
        margin: 1.5%;
      }

      .js-widget-check > div > h5.success {
        background: green;
        background-clip: text;
        filter: grayscale(0.5) saturate(0.9) sepia(0.4) brightness(1.4) contrast(1.2);
      }

      .js-widget-check > div > h5.info {
        background-clip: text;
        filter: saturate(2) sepia(4.5) brightness(1.1) contrast(3.2);
      }
      
      .js-widget-check > div > h5.danger {
        background: deeppink;
        color: deeppink;
        background-clip: text;
        filter: grayscale(0.8) brightness(1.2) saturate(0.8) contrast(0.9) invert(0.8);
      }

      .js-widget-check > div hr {
        background: violet !important;
        box-shadow: 0px 0px 10px 5px rgba(1, 100, 172, .1);
      }
    `
  }
  style.innerText = style.innerText.replace(/&lt;br&gt;/g, '').replace(/\s\s+/g, ' ').trim();
  document.head.append(style);

  // Create div
  checkerWidget = document.createElement("div");

  // div innerHtml
  checkerWidgetHtml = `
    <div class="js-widget-check">
    <div>
  `;

  // Availability
  var cutoff = 6;
  
  if (country_with_keys.length !== 0) {
    checkerWidgetHtml += '<h5 class="success">Key Availability: 🔑</h5>'
    switch (true) {
      case country_without_keys.length == 0:
        checkerWidgetHtml += '<p>&emsp;Every country has keys available!</p>';
        break;
      case country_with_keys.length == 1:
        checkerWidgetHtml += '<p>&emsp;Only <strong>one</strong> country has keys available!</p>';
        break;
      case country_with_keys.length <= cutoff:
        checkerWidgetHtml += '<p>&emsp;Only <strong>' + country_with_keys.length + '</strong> countries have keys available!</p>';
        break;
      case country_with_keys.length == country_without_keys.length:
        checkerWidgetHtml += '<p>&emsp;Some countries have keys available!</p>';
        break;
      case country_with_keys.length < country_without_keys.length:
        checkerWidgetHtml += '<p>&emsp;Few countries have keys available!</p>';
        break;
      default:
        checkerWidgetHtml += '<p>&emsp;Most countries have keys available!</p>';
    }
  }
  else {
    checkerWidgetHtml += `
      <h5 class="warning">&emsp;No keys?</h5>
      <img src="https://cdn3.emoji.gg/emojis/9174-no-bitches-megamind.png" width="60px" height="60px">
    `;
  }

  // Quantity and requirements
  for (var country in countryKeys) {
    if (countryKeys[country].length === 0) {
      continue;
    }
    for (var level in countryKeys[country]) {
      checkerWidgetHtml += `
        <ul>
          <li>&emsp;🔸 Tier: ${level}</li>
          <li>&emsp;🔸 Keys: ${countryKeys[country][level]}</li>
        </ul>
      `;
    }
    break;
  }

  // Unavailability
  if (country_without_keys.length !== 0 && country_with_keys.length !== 0) {
    if (country_with_keys.length <= cutoff) {
      checkerWidgetHtml += `
        <hr>
        <h5 class="info">Countries with keys: ✔️</h5>
        <p>&emsp;${country_with_keys.toString()}</p>
      `;
    } else {
      checkerWidgetHtml += `
        <hr>
        <h5 class="danger">Countries without keys: 🚫</h5>
        <p>&emsp;${country_without_keys.toString()}</p>
      `;
    }
  }

  checkerWidget.innerHTML = checkerWidgetHtml + `<hr></div></div><br>`;

  // Append the div
  rightPanel.insertAdjacentHTML("beforebegin", checkerWidgetHtml);
}

// Wait for variable
function wait_for_var(callback, interval = 5000) {
  let i = 0;
  logger.clearAllExceptMine();
  logger.group(`${namespace} Gathering key details`);
  const checkProperty = setInterval(() => {
    i++;
    logger.clearAllExceptMine();
    logger.log("%s Attempt to get GA's details => %i", namespace, i);
    if (typeof countryKeys === 'object') {
      clearInterval(checkProperty);
      logger.endGroup();
      callback();
    }
    else if (i >= timeout) {
      clearInterval(checkProperty);
      logger.endGroup();
      throw "AWAKeyChacker: Failed to get GA's details";
    }
  }, interval);
}

// Wait for element
function wait_for_el(selector, callback, interval = 5000) {
  let i = 0;
  logger.clearAllExceptMine();
  logger.group(`${namespace} Gathering required elements`);
  const checkQuery = setInterval(() => {
    i++;
    logger.clearAllExceptMine();
    logger.log("%s Attempt to find GA's scrollbar => %i", namespace, i);
    if (document.querySelector(selector)) {
      clearInterval(checkQuery);
      logger.endGroup();
      callback();
    }
    else if (i >= timeout) {
      clearInterval(checkQuery);
      logger.endGroup();
      throw "AWAKeyChacker: Failed to get GA's scrollbar";
    }
  }, interval);
}

// Custom logger
const logger = (function () {
  let logs = [];
  let groupStack = []; // Stack to manage groups

  const logColor = 'orange';
  const logHeaderColor = 'skyblue';
  const logErrorColor = 'indianred';

  // format the log message
  function formatMessage(format, ...args) {
    return format.replace(/%[sdif]/g, (match) => {
      if (args.length > 0) {
        return args.shift();
      } else {
        return match; // in case of mismatch, return the original match
      }
    });
  }

  return {
    log: function (format, ...args) {
      const message = formatMessage(format, ...args);

      let color = logColor; // Default color

      // Change the color for the last try/log
      if (args.includes(5))
        color = logErrorColor;

      if (groupStack.length > 0)
        logs.push({ type: 'log', message, group: groupStack[groupStack.length - 1] });
      else
        logs.push({ type: 'log', message });

      console.log('%c' + message, 'color:' + color);
    },

    group: function (groupName) {
      groupStack.push(groupName);
      logs.push({ type: 'group', name: groupName });
      console.group('%c' + groupName, `color: ${logHeaderColor}; font-weight: bold`);
    },

    endGroup: function () {
      if (groupStack.length > 0) {
        const groupName = groupStack.pop();
        logs.push({ type: 'endGroup', name: groupName });
        console.groupEnd();
      } else {
        console.warn('No group to end.');
      }
      console.log("\n\n");
    },

    clearAllExceptMine: function () {
      // Save the current logs
      const currentLogs = [...logs];
      // Clear the console
      console.clear();
      // Reprint only the custom logs
      currentLogs.forEach(log => {
        if (log.type === 'log')
          console.log('%c' + log.message, 'color:' + (logColor || log.color));
          
        else if (log.type === 'group')
          console.group('%c' + log.name, 'color:' + logHeaderColor);
          
        else if (log.type === 'endGroup')
          console.groupEnd();
      });
    }
  };
})();
window.logger = logger;

// Run
async function run() {
  await onInit.add(() => {
    GM_registerMenuCommand('Settings', () => {
      gmc.open();
    });
  });

  const interval = gmc.get('interval');
  try {
    wait_for_var(() => {
      wait_for_el('article[class*="top-widget"][class*="instructions"] h1:first-of-type', () => {
        check_keys(gmc.get('rgb_enabled'));
      }, interval)
    }, interval);
  }
  catch {
    throw "AWAKeyChacker: Unknown error";
  }
}
run();