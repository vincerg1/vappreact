// Footer.js
import React from 'react';
import '../styles/footer.css';
import '../styles/global.css';
import '../styles/header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInstagram } from '@fortawesome/free-brands-svg-icons';
import { faTiktok } from '@fortawesome/free-brands-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

function Footer() {

    const getCurrentYear = () => {
        const currentDate = new Date();
        return currentDate.getFullYear();
      };
      return (
        <footer>
          <p>
            VoltaPizzaApp {getCurrentYear()}.
          </p>
          <p>
            <a href="https://www.instagram.com/avaris.St/" className="icon_ins_footer" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
            <a href="https://www.TikTok.com/avaris.St/" className="icon_Tik_footer" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faTiktok} />
            </a>
            <a href="https://www.whatsapp.com/avaris.St/" className="icon_wapp_footer" target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faWhatsapp} />
            </a>
          </p>
        </footer>
      );
    }

export default Footer;