<?php
/**
 * Created by PhpStorm.
 * User: yards
 * Date: 9-5-18
 * Time: 11:18
 */

namespace Custom\Weather\Model;


use Magento\Framework\App\Request\Http;

class Weather
{
    const REQUEST_TIMEOUT = 2000;

    const END_POINT_URL = 'api.openweathermap.org/data/2.5/weather?q=';

    const API_KEY = 'fa49d4435bea40801e1bb1711bed3716';

    private $response;
    /**
     * @var \Magento\Framework\HTTP\Client\CurlFactory
     */
    private $curlFactory;
    /**
     * @var Http
     */
    private $http;
    /**
     * @var \Magento\Framework\Json\Helper\Data
     */
    private $jsonHelper;

    /**
     * Weather constructor.
     * @param \Magento\Framework\HTTP\Client\CurlFactory $curlFactory
     * @param Http $http
     * @param \Magento\Framework\Json\Helper\Data $jsonHelper
     */
    public function __construct(
        \Magento\Framework\HTTP\Client\CurlFactory $curlFactory,
        Http $http,
        \Magento\Framework\Json\Helper\Data $jsonHelper
    )
    {
        $this->curlFactory = $curlFactory;
        $this->http = $http;
        $this->jsonHelper = $jsonHelper;
    }

    public function getWeatherResponse($city)
    {
        if(!$this->response){
            $this->response = (object) $this->getResponseFromEndPoint($city);
        }
        return $this->response;
    }

    private function getResponseFromEndPoint($city)
    {
        return $this->jsonHelper->jsonDecode($this->getResponse($city));
    }

    private function getResponse($city)
    {
        /** @var \Magento\Framework\HTTP\Client\Curl $client */
        $client = $this->curlFactory->create();
        $client->setTimeout(self::REQUEST_TIMEOUT);
        $client->get(
            self::END_POINT_URL . $city . '&APPID=' . self::API_KEY
        );
        return $client->getBody();
    }
}
