import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Trans, useTranslation } from 'react-i18next';
import { Col } from 'react-bootstrap';
import { Carousel } from 'react-responsive-carousel';

import NewsComponent from '../Components/News/News';
import AlertPanel from '../Components/Site/AlertPanel';
import Panel from '../Components/Site/Panel';
import SideBar from '../Components/Lobby/SideBar';
import UserList from '../Components/Lobby/UserList';
import { loadNews } from '../redux/actions';
import { News } from '../redux/types';

import './Lobby.scss';
import 'react-responsive-carousel/lib/styles/carousel.min.css';

const Lobby = () => {
    const dispatch = useDispatch();
    const { bannerNotice, motd, users } = useSelector((state) => ({
        bannerNotice: state.lobby.bannerNotice,
        lobbyError: state.lobby.lobbyError,
        messages: state.lobby.messages,
        motd: state.lobby.motd,
        users: state.lobby.users
    }));
    const news = useSelector((state) => state.news.news);
    const apiState = useSelector((state) => {
        const retState = state.api[News.RequestNews];

        return retState;
    });
    const { t } = useTranslation();

    useEffect(() => {
        dispatch(loadNews({ limit: 3 }));
    }, [dispatch]);

    const banners = [
        {
            img: '/banner/NKFL-s18-1.png',
            link:
                'https://docs.google.com/forms/d/e/1FAIpQLScdV0qp2V81XMbyw_ore6IyiN1nNRlpf4rpRyCpDNujFLOSZw/viewform'
        },
        {
            img: '/banner/average-joes.png',
            link: 'https://discord.gg/bxSGTcSH5W'
        }
    ];

    return (
        <div className='flex-container'>
            <SideBar>
                <UserList users={users} />
            </SideBar>
            <div>
                <Col sm={{ span: 10, offset: 1 }}>
                    <div className='main-header' />
                    <Carousel
                        autoPlay={true}
                        infiniteLoop={true}
                        showArrows={false}
                        showThumbs={false}
                        showIndicators={false}
                        showStatus={false}
                        interval={7500}
                    >
                        {banners.map((banner) => {
                            return (
                                <a
                                    key={banner.img}
                                    target='_blank'
                                    rel='noreferrer'
                                    href={banner.link}
                                >
                                    <div className='banner'>
                                        <img src={banner.img} />
                                    </div>
                                </a>
                            );
                        })}
                    </Carousel>
                </Col>
            </div>

            {motd?.message && (
                <div>
                    <Col sm={{ span: 10, offset: 1 }} className='banner'>
                        <AlertPanel type={motd.motdType} message={motd.message}></AlertPanel>
                    </Col>
                </div>
            )}
            {bannerNotice && (
                <div>
                    <Col sm={{ span: 10, offset: 1 }} className='annoucement'>
                        <AlertPanel message={bannerNotice} type='error' />
                    </Col>
                </div>
            )}
            <div>
                <Col sm={{ span: 10, offset: 1 }}>
                    <Panel title={t('Latest site news')}>
                        {apiState?.loading ? (
                            <div>
                                <Trans>News loading, please wait...</Trans>
                            </div>
                        ) : null}
                        <NewsComponent news={news} />
                    </Panel>
                </Col>
            </div>
        </div>
    );
};

Lobby.displayName = 'Lobby';

export default Lobby;
