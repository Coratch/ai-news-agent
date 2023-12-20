package com.coratch.pdf.textreplacer;

import javax.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "textreplacer")
public class TextReplacerApplicationProperties {

	@NotNull
	private String pdf;
	
	private String targetPDF;
	
	/**
	 * The PDF page id which should be used.
	 */
	private Integer page = 0;
	
	/**
	 * The text which should be replaced by an image
	 */
	@NotNull
	private String searchText;
	
	/**
	 * The path to the image of which should be placed in the PDF.
	 */
	@NotNull
	private String image;
	
	/**
	 * The width of the image how it should be placed (resized) in the PDF
	 */
	@NotNull
	private Integer imageWidth;
	
	/**
	 * The height of the image how it should be placed (resized) in the PDF
	 */
	@NotNull
	private Integer imageHeight;

	/**
	 * The path to the image of which should be created in the PDF.
	 */
	private String targetImagePath;
	
	

	public String getImage() {
		return image;
	}

	public void setImage(String image) {
		this.image = image;
	}

	public String getPdf() {
		return pdf;
	}

	public void setPdf(String pdf) {
		this.pdf = pdf;
	}

	public Integer getPage() {
		return page;
	}

	public void setPage(Integer page) {
		this.page = page;
	}

	public String getSearchText() {
		return searchText;
	}

	public void setSearchText(String searchText) {
		this.searchText = searchText;
	}

	public String getTargetPDF() {
		return targetPDF;
	}

	public void setTargetPDF(String targetPDF) {
		this.targetPDF = targetPDF;
	}

	@Override
	public String toString() {
		return "TextReplacerApplicationProperties [pdf=" + pdf + ", targetPDF=" + targetPDF + ", page=" + page
				+ ", searchText=" + searchText + ", image=" + image + "]";
	}

	public Integer getImageWidth() {
		return imageWidth;
	}

	public void setImageWidth(Integer imageWidth) {
		this.imageWidth = imageWidth;
	}

	public Integer getImageHeight() {
		return imageHeight;
	}

	public void setImageHeight(Integer imageHeight) {
		this.imageHeight = imageHeight;
	}

	public String getTargetImagePath() {
		return targetImagePath;
	}

	public void setTargetImagePath(String targetImagePath) {
		this.targetImagePath = targetImagePath;
	}
	
}
