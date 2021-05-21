<?php

namespace Custom\Weather\Block;

use Magento\Framework\View\Element\Template;

class WeatherBlock extends \Magento\Framework\View\Element\Template
{
    /**
     * @var \Custom\Weather\Model\WeatherFactory
     */
    private $weatherFactory;

    /**
     * WeatherBlock constructor.
     * @param Template\Context $context
     * @param \Custom\Weather\Model\WeatherFactory $weatherFactory
     * @param array $data
     */
    public function __construct(
        Template\Context $context,
        \Custom\Weather\Model\WeatherFactory $weatherFactory,
        array $data = []
    )
    {
        parent::__construct($context, $data);
        $this->weatherFactory = $weatherFactory;
    }

    /**
     * @return \Custom\Weather\Model\Weather[]
     */
    public function getWeatherInformation($city)
    {
        return $this->weatherFactory->create()->getWeatherResponse($city);
    }
}
